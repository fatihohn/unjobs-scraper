import { DutyStation, Job, Organization } from "src/lib/types";
import { ApiClient } from "../lib/api-client";
import * as cheerio from "cheerio";
import { connect } from "../lib/puppeteer-real-browser/lib/cjs/index";

export class JobsAPI {
  constructor(private apiClient: ApiClient) {}

  async getJobs(dto: {
    organization?: Organization;
    dutyStation?: DutyStation;
    keywords?: string[];
  }) {
    const { organization, dutyStation, keywords } = dto;
    if (organization && dutyStation) {
      return this.getOrganizationDutyStationJobs(
        organization,
        dutyStation,
        keywords
      );
    } else if (organization) {
      return this.getOrganizationJobs(organization, keywords);
    } else {
      return this.getDutystationJobs(dutyStation, keywords);
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

  async getOrganizationDutyStationJobs(
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
        jobElements.each((_index, element) => {
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

  async getDutystationJobs(dutyStation: DutyStation, keywords?: string[]) {
    const url = "/duty_stations/:param";
    const param = dutyStation.code;

    let isMorePages = true;
    let page = 1;
    const jobs = [];

    while (isMorePages) {
      const response = await this.fetchJobsPage(url, param, page);
      const $ = cheerio.load(response);
      const jobElements = $(".job");

      const jobItems = [];
      if (jobElements.length > 0) {
        jobElements.each((_index, element) => {
          const jobElement = $(element);
          const title = jobElement.find(".jtitle").text();
          const organization = jobElement.html().split("<br>")[1]?.trim();
          const url = jobElement.find("a").attr("href");
          const snippet = jobElement?.find(".jobsnippet .fp-snippet")?.text();
          const time = new Date(jobElement.find("time").attr("datetime"));
          const id = jobElement.attr("id");

          const job = {
            id,
            title,
            url,
            snippet,
            organization,
            dutyStation: dutyStation.name,
            time,
          };

          if (job.id) {
            jobItems.push(job);
          }
        });
        page++;
      } else {
        isMorePages = false;
        break;
      }

      for (const job of jobItems) {
        let detailElement = null;
        let retryCount = 0;
        while (retryCount < 3) {
          try {
            const jobDetail = await this.fetchJobDetail(job.id);
            console.log(job, "success");
            const $ = cheerio.load(jobDetail);
            detailElement = $(`#job${job.id}`);
          } catch (error) {
            // console.error("Failed to fetch job detail", job.url, error.message.slice(0, 200));
            console.error(job.url, "failed");
          } finally {
            retryCount++;
          }

          if (keywords) {
            if (
              keywords.some(
                (keyword) =>
                  job.title.toLowerCase().includes(keyword.toLowerCase()) ||
                  job.snippet?.toLowerCase()?.includes(keyword.toLowerCase()) ||
                  detailElement
                    ?.text()
                    ?.toLowerCase()
                    ?.includes(keyword.toLowerCase())
              )
            ) {
              jobs.push(job);
            }
          } else {
            jobs.push(job);
          }
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
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

  async fetchJobDetail(id: string): Promise<string> {
    let url = "/vacancies/:id";

    const realBrowserOption = {
      args: ["--start-maximized"],
      turnstile: true,
      headless: false,
      // disableXvfb: true,
      customConfig: {},
      connectOption: {
        defaultViewport: null,
      },
      plugins: [],
    };
    const { page, browser } = await connect(realBrowserOption);
    const target = this.apiClient.baseUrl + url.replace(":id", id);
    console.log("target", target);
    await page.goto(target).catch((error) => {
      console.error("Failed to fetch job detail", error.message.slice(0, 200));
    });
    let verify = null;
    let startDate = Date.now();
    while (!verify && Date.now() - startDate < 30000) {
      verify = await page
        .evaluate(() => {
          return document.querySelector(`.job${id}`) ? true : null;
        })
        .catch(() => null);
      await new Promise((r) => setTimeout(r, 1000));
    }
    const content = await page.content();
    await browser.close();
    return content;
  }
}
