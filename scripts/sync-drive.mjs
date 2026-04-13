#!/usr/bin/env node
/**
 * sync-drive.mjs — Syncs Google Drive folder structure into the ARIA database.
 * Called from the server's drive.sync route via child_process.
 * 
 * Root folder: 1ZLGvT92wDZT_-Z5KSjsyJ9S3WtLnOChu
 * Structure:
 *   /VARIAS GRABACIÓN/  (subfolders by area)
 *   /REUNIONES TEAMS/   (Teams recordings)
 *   /PLAUD/             (Plaud transcriptions by area)
 */
import { execSync } from "child_process";

const ROOT_FOLDER_ID = "1ZLGvT92wDZT_-Z5KSjsyJ9S3WtLnOChu";

function listFiles(folderId) {
  try {
    const cmd = `gws drive files list --params '{"q": "'\\''${folderId}'\\'' in parents", "fields": "files(id,name,mimeType,size,createdTime,webViewLink,parents)", "pageSize": 200}' --format json`;
    const out = execSync(cmd, { encoding: "utf-8", timeout: 30000 });
    const parsed = JSON.parse(out);
    return parsed.files || [];
  } catch (e) {
    console.error(`Error listing folder ${folderId}:`, e.message);
    return [];
  }
}

async function syncFolder(folderId, parentPath = "") {
  const files = listFiles(folderId);
  const results = [];

  for (const file of files) {
    const isFolder = file.mimeType === "application/vnd.google-apps.folder";
    const currentPath = parentPath ? `${parentPath}/${file.name}` : file.name;

    if (isFolder) {
      // Recurse into subfolders (max 2 levels deep)
      const depth = currentPath.split("/").length;
      if (depth <= 3) {
        const subResults = await syncFolder(file.id, currentPath);
        results.push(...subResults);
      }
    } else {
      results.push({
        driveId: file.id,
        nombre: file.name,
        mimeType: file.mimeType,
        tamano: file.size ? parseInt(file.size) : null,
        carpeta: currentPath.split("/").slice(0, -1).join("/") || parentPath || "Raíz",
        area: extractArea(currentPath),
        url: file.webViewLink,
        createdTime: file.createdTime,
      });
    }
  }

  return results;
}

function extractArea(path) {
  // Try to extract area name from path
  const parts = path.split("/");
  // If path is like "PLAUD/Talento humano/file.pdf", area = "Talento humano"
  // If path is like "VARIAS GRABACIÓN/Recordings/Marketing/file.pdf", area = "Marketing"
  if (parts.length >= 3) return parts[parts.length - 2];
  if (parts.length >= 2) return parts[0];
  return "Sin clasificar";
}

async function main() {
  console.log("Starting Drive sync...");
  const allFiles = await syncFolder(ROOT_FOLDER_ID);
  console.log(`Found ${allFiles.length} files`);
  // Output as JSON for the server to consume
  console.log(JSON.stringify(allFiles));
}

main().catch(console.error);
