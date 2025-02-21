import { Organization } from "../lib/types";
import { ApiClient } from "../lib/api-client";

export class OrganizationsAPI {
  constructor(private apiClient: ApiClient) {}

  async getOrganizations(): Promise<Organization[]> {
    const response = await this.fetchOrganizations();

    const regex = new RegExp(
      `<a href="(${this.apiClient.baseUrl}\\/organizations\\/[^"]+)">([^<]+)<\\/a>`,
      'g'
    );
    const matches = [...response.matchAll(regex)].map((match) => ({
      name: match[2],
      url: match[1],
      code: match[1].split("/").pop(),
    }));

    return matches;
  }

  async fetchOrganizations() {
    return this.apiClient.get("/organizations");
  }
}
