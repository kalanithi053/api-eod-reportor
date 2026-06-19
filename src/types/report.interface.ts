export interface StatusLog {
  date: string;
  task: string;
  duration: string;
  name: string;
}

export interface StatusLog {
  date: string;
  task: string;
  duration: string;
  name: string;
}

export interface StatusProject {
  name: string;
  logs: StatusLog[];
}

export interface StatusMailPayload {
  reportDate: string;
  totalHours: string;
  resourceName: string;
  projects: StatusProject[];
  singleProject?: boolean;
  multipleProjects?: boolean;
}
