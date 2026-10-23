const endpoint = process.env.GRAPHQL_URL ?? 'http://localhost:3000/graphql';
const query = `query {
  profile {
    name description githubUrl
    skills { name }
    experience { company position period achievements }
    projects { name url }
  }
}`;

const response = await fetch(endpoint, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ query }),
});
const json = await response.json();
if (!response.ok || json.errors || !json.data?.profile) {
  console.error(json);
  process.exitCode = 1;
} else {
  const { profile } = json.data;
  console.log(`OK: ${profile.name} — ${profile.skills.length} skills, ${profile.experience.length} experiences, ${profile.projects.length} projects`);
}
