import * as fs from "fs";
import Handlebars from "handlebars";
import * as path from "path";
import { StatusMailPayload } from "src/types/report.interface";

export const htmlGenerator = (data: StatusMailPayload) => {
  const templatePathCandidates = [
    path.join(__dirname, "templates", "status-update.hbs"),
    path.resolve(
      process.cwd(),
      "src",
      "utils",
      "templates",
      "status-update.hbs",
    ),
  ];

  const templatePath = templatePathCandidates.find((candidate) =>
    fs.existsSync(candidate),
  );

  if (!templatePath) {
    throw new Error("Status update template not found");
  }

  const templateSource = fs.readFileSync(templatePath, "utf8");

  // Compile template
  const template = Handlebars.compile(templateSource);

  return template(data);
};
