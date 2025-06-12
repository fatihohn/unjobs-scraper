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
    this.db = DB.getInstance();
    this.organizations = options.organizations;
    this.locations = options.locations;
    this.keywords = options.keywords;
  }
  
  async init() {
    this.mailer = await Mailer.getInstance();
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

    for (const location of this.locations) {
      const locationJobs = await jobsAPI
        .getJobs({
          dutyStation: { name: location.name, code: location.code },
          keywords: this.keywords,
        })
        .catch((error) => {
          console.error(
            `Failed to fetch jobs for ${location.name} at ${location.name}`,
            error
          );
          throw new Error(
            `Failed to fetch jobs for ${location.name} at ${location.name}: ${error.message}`
          );
        });

      if (locationJobs.length > 0) {
        jobs.push(...locationJobs);

        const insert = this.db.prepare(
          "INSERT INTO jobs (id, title, url, snippet, organization, dutyStation, time) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING"
        );

        for (const job of locationJobs) {
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
                `[UNJobs Scraper] New job added - ${job.title} at ${job.organization}`,
                `A new job has been added: ${job.title} at ${job.organization} in ${job.dutyStation}`,
                `<div>
                      <div>
                        <a href="${job.url}">${job.title} at ${job.organization}</a>
                      <div>
                      <div>${job.snippet}</div>
                    </div>`
              );
            }
          } catch (error) {
            console.error("Failed to insert job", error);
          }
        }
      }
    }
  }
}
