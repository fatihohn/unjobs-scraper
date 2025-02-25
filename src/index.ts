import { readFileSync } from "fs";
import cron from "node-cron";
import { ApiClient } from "./lib/api-client";
import { JobCollectorDaemon } from "./daemon/job-collector.daemon";
import { DB } from "./lib/database";
import { Mailer } from "./lib/mailer";

const config = JSON.parse(readFileSync(`${__dirname}/config.json`, "utf-8"));
const { rootURL, organizations, locations, keywords } = config;
const apiClient = new ApiClient(rootURL);
const mailer = Mailer.getInstance();

const jobCollectorDaemon = new JobCollectorDaemon(
  apiClient,
  new DB(`${__dirname}/data/database.sqlite`),
  {
    organizations,
    locations,
    keywords,
  }
);

cron.schedule("0 * * * *", () => {
  jobCollectorDaemon.init().then(async () => {
    let isDone = false;
    while (!isDone) {
      try {
        await jobCollectorDaemon.collectJobs();
        isDone = true;
        console.error("Job collection complete", new Date());
      } catch (error) {
        console.error("Job collection failed", error);
        await mailer.sendEmail(
          process.env.GMAIL_USER,
          "Job collection failed",
          "Job collection failed",
          error.message
        );
        await new Promise((resolve) => setTimeout(resolve, 60000));
      }
    }
  });
});
