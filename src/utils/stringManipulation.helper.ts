export const generateSubject = (name: string, date: string) => {
  return `${name} - daily updates - ${new Date(date).toLocaleDateString(
    "en-US",
    {
      month: "long",
      year: "numeric",
      day: "numeric",
    },
  )}`;
};
