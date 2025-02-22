import { readFileSync } from "fs";
import { ApiClient } from "./lib/api-client";
import { JobCollectorDaemon } from "./daemon/job-collector.daemon";
import { DB } from "./lib/database";

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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

jobCollectorDaemon.init().then(async () => {
  while (true) {
    try {
      await jobCollectorDaemon.collectJobs();
    } catch (error) {
      console.error("Job collection failed", error);
    }
  }
});
