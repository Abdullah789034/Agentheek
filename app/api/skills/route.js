import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const skillsDir = path.join(process.cwd(), "skills");

    if (!fs.existsSync(skillsDir)) {
      return Response.json({ skills: [] });
    }

    const files = fs.readdirSync(skillsDir);
    const skills = files
      .filter((f) => f.endsWith(".md"))
      .map((f) => {
        const name = f.replace(".md", "");
        const content = fs.readFileSync(path.join(skillsDir, f), "utf-8");
        // Extract first heading as display name
        const match = content.match(/^#\s+(.+)/m);
        const displayName = match ? match[1].trim() : name;
        // Extract first non-heading paragraph for description
        const textLines = content.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#') && !l.startsWith('---'));
        const description = textLines.length > 0 ? textLines[0].slice(0, 90) : '';
        return { name, displayName, description };
      });

    return Response.json({ skills });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
