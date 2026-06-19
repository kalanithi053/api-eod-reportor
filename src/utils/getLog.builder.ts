import { format, parseISO } from "date-fns";

export type GetTimeLog = {
  zohoUserId: string;
  startDate: string;
};

export const getLogBuiilder = (zohoUserId: string, startDate: string) => {
  return {
    page: 1,
    per_page: 500,
    view_type: "day",
    start_date: startDate,
    filter: JSON.stringify({
      criteria: [
        {
          field_name: "user",
          criteria_condition: "is",
          value: [zohoUserId],
        },
      ],
      pattern: "1",
    }),
    report_type: "module",
    module: JSON.stringify({
      type: "task",
    }),
  };
};

const addDurations = (time1: string, time2: string): string => {
  const [h1, m1] = time1.split(":").map(Number);
  const [h2, m2] = time2.split(":").map(Number);

  const totalMinutes = h1 * 60 + m1 + h2 * 60 + m2;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

type LogEntry = {
  date: string;
  task: string;
  duration: string;
  name: string;
};

export const sendResponse = (response: Record<string, any>) => {
  if (!response?.time_logs?.length) {
    return {
      totalHours: "0:00",
      resourceName: "",
      reportDate: "",
      projects: [],
    };
  }

  const projectMap: Record<string, LogEntry[]> = {};

  response.time_logs.forEach((day: any) => {
    day.log_details?.forEach((log: any) => {
      const projectName = log.project?.name ?? "Unknown Project";

      const entry: LogEntry = {
        date: log.date,
        task: log.module_detail?.name ?? "",
        duration: log.log_hour ?? "0:00",
        name: log.owner?.first_name ?? "",
      };

      if (!projectMap[projectName]) {
        projectMap[projectName] = [];
      }

      projectMap[projectName].push(entry);
    });
  });

  const projects = Object.entries(projectMap).map(
    ([name, logs]): {
      name: string;
      logs: LogEntry[];
    } => {
      const mergedLogs = Object.values(
        logs.reduce<Record<string, LogEntry>>((acc, log) => {
          if (!acc[log.task]) {
            acc[log.task] = { ...log };
          } else {
            acc[log.task].duration = addDurations(
              acc[log.task].duration,
              log.duration,
            );
          }

          return acc;
        }, {}),
      );

      return {
        name,
        logs: mergedLogs,
      };
    },
  );

  const firstLog = response.time_logs?.[0]?.log_details?.[0];

  return {
    totalHours: response.log_hours?.total_hours ?? "0:00",
    resourceName: firstLog?.owner?.first_name ?? "",
    reportDate: firstLog?.date
      ? format(parseISO(firstLog.date), "EEEE, MMMM d, yyyy")
      : "",
    projects,
  };
};
