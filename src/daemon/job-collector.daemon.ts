import { DB } from "../lib/database";
import { DutyStation, Job, Organization } from "../lib/types";
import { ApiClient } from "../lib/api-client";
import { JobsAPI } from "../api";
import { Mailer } from "../lib/mailer";
import dotenv from "dotenv";
dotenv.config();

type JobCollectorDaemonOptions = {
  organizations: Organization[];
  locations: DutyStation[];
  keywords: string[];
};

export class JobCollectorDaemon {
  organizations: Organization[];
  locations: DutyStation[];
  keywords: string[];
  private mailer: Mailer;

  constructor(
    private apiClient: ApiClient,
    private db: DB,
    options: JobCollectorDaemonOptions
  ) {
    this.mailer = Mailer.getInstance();
    this.db = DB.getInstance();
    this.organizations = options.organizations;
    this.locations = options.locations;
    this.keywords = options.keywords;
  }

  async init() {
    this.db.exec(
      "CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, title TEXT, url TEXT, snippet TEXT, organization TEXT, dutyStation TEXT, time TEXT)"
    );
  }

  async getDbJobCount() {
    const count = this.db
      .prepare("SELECT COUNT(*) as count FROM jobs")
      .get() as { count: number };
    return count ? Number(count.count) : 0;
  }

  async collectJobs() {
    const currentJobCount = await this.getDbJobCount();
    console.log(`Current job count: ${currentJobCount}`);
    const jobsAPI = new JobsAPI(this.apiClient);

    const jobs = [];
    const organizationsCount = this.organizations.length;
    let organizationIndex = 0;
    for (const organization of this.organizations) {
      const promises = [];
      for (const location of this.locations) {
        promises.push(async () => {
          const organizationJobs = await jobsAPI.getJobs({
            organization: {
              name: organization.name,
              code: organization.code,
            },
            dutyStation: { name: location.name, code: location.code },
            keywords: this.keywords,
          }).catch(error => {
            console.error(`Failed to fetch jobs for ${organization.name} at ${location.name}`, error);
            throw error;
          });

          if (organizationJobs.length > 0) {
            jobs.push(...organizationJobs);

            const insert = this.db.prepare(
              "INSERT INTO jobs (id, title, url, snippet, organization, dutyStation, time) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING"
            );

            for (const job of organizationJobs) {
              try {
                const insertResult = insert.run(
                  job.id,
                  job.title,
                  job.url,
                  job.snippet,
                  job.organization,
                  job.dutyStation,
                  job.time.toISOString()
                );

                if (insertResult.changes) {
                  console.log(`New job added: ${job.title}`);
                  this.mailer.sendEmail(
                    process.env.GMAIL_USER,
                    `[UNJobs Scraper] New job added - ${job.title}`,
                    `A new job has been added: ${job.title}`,
                    `<div>
                      <div>
                        <a href="${job.url}">${job.title}</a>
                      <div>
                      <div>${job.snippet}</div>
                    </div>`
                  );
                }
              } catch (error) {}
            }
          }
        });
      }

      await Promise.all(promises.map((p) => p()));

      organizationIndex++;
      console.log(
        `Fetched jobs for ${organizationIndex} of ${organizationsCount} organizations`,
        `Total jobs fetched: ${jobs.length}`
      );
    }
  }
}
