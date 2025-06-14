import { readFileSync } from "fs";
import cron from "node-cron";
import { ApiClient } from "./lib/api-client";
import { JobCollectorDaemon } from "./daemon/job-collector.daemon";
import { DB } from "./lib/database";
import { Mailer } from "./lib/mailer";

const config = JSON.parse(readFileSync(`${__dirname}/config.json`, "utf-8"));
const { rootURL, organizations, locations, keywords } = config;
const apiClient = new ApiClient(rootURL);

const jobCollectorDaemon = new JobCollectorDaemon(
  apiClient,
  new DB(`${__dirname}/data/database.sqlite`),
  {
    organizations,
    locations,
    keywords,
  }
);

const collectJobs = async () => {
  const mailer = await Mailer.getInstance();

  jobCollectorDaemon.init().then(async () => {
    let isDone = false;
    let retries = 0;
    while (!isDone) {
      try {
        await jobCollectorDaemon.collectJobs();
        isDone = true;
        console.log("Job collection complete", new Date());
      } catch (error) {
        retries++;
        if (retries > 5) {
          await mailer.sendEmail(
            process.env.GMAIL_USER,
            "Job collection failed",
            "Job collection failed",
            error.message
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 60000));
      }
    }
  });
};

// run once on startup
collectJobs();

cron.schedule("0 * * * *", collectJobs);
