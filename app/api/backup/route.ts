import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { readFile, unlink } from "fs/promises";
import * as path from "path";
import * as os from "os";

const execAsync = promisify(exec);

export async function GET(req: NextRequest) {
  try {
    // Parse DATABASE_URL
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return NextResponse.json(
        { error: "DATABASE_URL not configured" },
        { status: 500 }
      );
    }

    // Extract connection details from DATABASE_URL
    const url = new URL(dbUrl);
    const username = url.username || "postgres";
    const password = url.password || "";
    const host = url.hostname || "localhost";
    const port = url.port || "5432";
    const database = url.pathname.slice(1); // Remove leading '/'

    // Create backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFileName = `backup-${timestamp}.sql`;
    const backupPath = path.join(os.tmpdir(), backupFileName);

    // Construct pg_dump command with output redirection
    const pgDumpCommand = `pg_dump -h ${host} -p ${port} -U ${username} -d ${database} -F p > "${backupPath}"`;

    // Set password environment variable if provided
    const env = { ...process.env };
    if (password) {
      env.PGPASSWORD = password;
    }

    // Execute pg_dump with shell
    try {
      await execAsync(pgDumpCommand, { 
        env,
        shell: process.platform === "win32" ? "cmd.exe" : "/bin/bash"
      });
    } catch (execError: any) {
      console.error("pg_dump execution error:", execError.stderr || execError.message);
      throw new Error(`Failed to create database dump: ${execError.stderr || execError.message}`);
    }

    // Read the backup file
    const backupBuffer = await readFile(backupPath);

    // Clean up the file
    await unlink(backupPath);

    // Return as downloadable file
    return new NextResponse(backupBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/sql",
        "Content-Disposition": `attachment; filename="${backupFileName}"`,
      },
    });
  } catch (error) {
    console.error("Backup error:", error);
    return NextResponse.json(
      { error: "Failed to create database backup", details: String(error) },
      { status: 500 }
    );
  }
}
