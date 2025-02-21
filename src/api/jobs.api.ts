import { DutyStation, Job, Organization } from "src/lib/types";
import { ApiClient } from "../lib/api-client";
import * as cheerio from "cheerio";

export class JobsAPI {
  constructor(private apiClient: ApiClient) {}

  async getJobs(dto: {
    organization: Organization;
    dutyStation?: DutyStation;
    keywords?: string[];
  }) {
    const { organization, dutyStation, keywords } = dto;
    if (dutyStation) {
      return this.getDutyStationJobs(organization, dutyStation, keywords);
    } else {
      return this.getOrganizationJobs(organization, keywords);
    }
  }

  async getOrganizationJobs(
    organization: Organization,
    keywords?: string[]
  ): Promise<Job[]> {
    const url = "/organizations/:param";
    const param = organization.code;

    let isMorePages = true;
    let page = 1;
    const jobs = [];

    while (isMorePages) {
      const response = await this.fetchJobsPage(url, param, page);
      const $ = cheerio.load(response);
      const jobElements = $(".job");

      if (jobElements.length > 0) {
        jobElements.each((index, element) => {
          const jobElement = $(element);
          const title = jobElement.find(".jtitle").text();
          const url = jobElement.find("a").attr("href");
          const snippet = jobElement.find(".jobsnippet .fp-snippet").text();
          const time = new Date(jobElement.find("time").attr("datetime"));
          const id = jobElement.attr("id");

          const job = {
            id,
            title,
            url,
            snippet,
            organization: organization.name,
            dutyStation: null,
            time,
          };

          if (id) {
            if (keywords) {
              if (
                keywords.some(
                  (keyword) =>
                    job.title.toLowerCase().includes(keyword.toLowerCase()) ||
                    job.snippet.toLowerCase().includes(keyword.toLowerCase())
                )
              ) {
                jobs.push(job);
              }
            } else {
              jobs.push(job);
            }
          }
        });
        page++;
      } else {
        break;
      }
    }

    return jobs;
  }

  async getDutyStationJobs(
    organization: Organization,
    dutyStation: DutyStation,
    keywords?: string[]
  ) {
    const url = "/offices/:param";
    const param = `${organization.code}_${dutyStation.code}`;
    let isMorePages = true;
    let page = 1;
    const jobs = [];

    while (isMorePages) {
      const response = await this.fetchJobsPage(url, param, page);
      const $ = cheerio.load(response);

      const jobElements = $("a .job");
      if (jobElements.length > 0) {
        jobElements.each((index, element) => {
          const jobElement = $(element);
          const title = jobElement.find(".jtitle").text();
          const url = jobElement.parent().attr("href");
          const snippet = jobElement.find(".jobsnippet .fp-snippet").text();
          const time = new Date(jobElement.find("time").attr("datetime"));
          const id = jobElement.attr("id");

          const job = {
            id,
            title,
            url,
            snippet,
            organization: organization.name,
            dutyStation: dutyStation.name,
            time,
          };

          if (id) {
            if (keywords) {
              if (
                keywords.some(
                  (keyword) =>
                    job.title.toLowerCase().includes(keyword.toLowerCase()) ||
                    job.snippet.toLowerCase().includes(keyword.toLowerCase())
                )
              ) {
                jobs.push(job);
              }
            } else {
              jobs.push(job);
            }
          }
        });
        page++;
      } else {
        break;
      }
    }

    return jobs;
  }

  async fetchJobsPage(url: string, param: string, page: number) {
    let params: { param: string; page?: number } = { param };

    if (page > 1) {
      url = `${url}/:page`;
      params.page = page;
    }

    return this.apiClient.get(url, params);
  }

  async fetchOrganizationJobs(organization: string) {
    let url = "/organizations/:param";
    let param = organization;

    return this.apiClient.get(url, {
      param,
    });
  }
}
