export type Organization = {
  name: string;
  url?: string;
  code?: string;
};

export type DutyStation = {
  name: string;
  url?: string;
  code: string;
};

export type Job = {
  id: string;
  title: string;
  url: string;
  snippet: string;
  organization: Organization;
  dutyStation: DutyStation;
  time: Date;
};
