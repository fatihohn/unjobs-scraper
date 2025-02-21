import { DutyStation } from "../lib/types";
import { ApiClient } from "../lib/api-client";

export class DutyStationsAPI {
  constructor(private apiClient: ApiClient) {}

  async getDutyStations(): Promise<DutyStation[]> {
    const response = await this.fetchDutyStations();
    // const regex =
    //   /<a href="(https:\/\/unjobs\.org\/duty_stations\/[^"]+)">([^<]+)<\/a>/g;

    const regex = new RegExp(
      `<a href="(${this.apiClient.baseUrl}\\/duty_stations\\/[^"]+)">([^<]+)<\\/a>`,
      "g"
    );

    const matches = [...response.matchAll(regex)].map((match) => ({
      name: match[2],
      url: match[1],
      code: match[1].split("/").pop(),
    }));

    return matches;
  }

  async fetchDutyStations() {
    return this.apiClient.get("/duty_stations");
  }
}
