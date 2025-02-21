import { readFileSync, writeFileSync } from "fs";
import { Parser } from "json2csv";
import { ApiClient } from "./lib/api-client";
import { DutyStationsAPI, JobsAPI, OrganizationsAPI } from "./api";

const currentPath = process.cwd();
const dataDir = `${currentPath}/data`;
const config = JSON.parse(readFileSync(`${__dirname}/config.json`, "utf-8"));
const { rootURL, organizations, locations, keywords } = config;
const apiClient = new ApiClient(rootURL);
const organizationsAPI = new OrganizationsAPI(apiClient);
const dutyStationsAPI = new DutyStationsAPI(apiClient);
const jobsAPI = new JobsAPI(apiClient);

// organizationsAPI.getOrganizations().then(res => {
//   writeFileSync(`${dataDir}/organizations.json`, JSON.stringify(res, null, 2));
//   console.log("Organizations data saved to data/organizations.json");
// });
// dutyStationsAPI.getDutyStations().then(res => {
//   writeFileSync(`${dataDir}/duty-stations.json`, JSON.stringify(res, null, 2));
//   console.log("Duty stations data saved to data/duty-stations.json");
// });

const getAllJobs = async () => {
  const jobs = [];
  const organizationsCount = organizations.length;
  let organizationIndex = 0;
  for (const organization of organizations) {
    for (const location of locations) {
      const organizationJobs = await jobsAPI.getJobs({
        organization: { name: organization.name, code: organization.code },
        dutyStation: { name: location.name, code: location.code },
        keywords,
      });
      if (organizationJobs.length > 0) {
        jobs.push(...organizationJobs);
        console.log(
          `Fetched ${organizationJobs.length} jobs for ${organization.name} in ${location.name}`
        );
      }
    }
    organizationIndex++;
    console.log(
      `Fetched jobs for ${organizationIndex} of ${organizationsCount} organizations`,
      `Total jobs fetched: ${jobs.length}`
    );
  }

  if (jobs.length > 0) {
    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(jobs);
    writeFileSync(`${dataDir}/jobs.csv`, csv);
    console.log("Jobs data saved to data/jobs.csv");
  } else {
    console.log("No jobs found.");
  }
};

getAllJobs();
