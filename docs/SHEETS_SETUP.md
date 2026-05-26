# Google Sheets export — 5-minute setup

Pluck Pro can append scraped rows to a Google Sheet after every run. The
integration uses a tiny **Google Apps Script** that you deploy on your own
Google account — no OAuth dance, no Pluck-managed credentials.

## How it works

```
Pluck runs your scrape job
        │
        ▼  POST { rows: [...] }
   Your Apps Script (deployed as web app, runs as YOU)
        │
        ▼  SpreadsheetApp.appendRow(...)
   Your Google Sheet
```

The Apps Script runs in your Google account, so it has write access to any
sheet you give it. The Apps Script's web-app URL is the shared secret —
keep it private (don't paste it in screenshots).

## Setup

### 1. Create a sheet

1. Go to [sheets.new](https://sheets.new) — creates a blank Google Sheet
2. In row 1, put column headers that match your Pluck job's columns
   (e.g. `title`, `price`, `url`). Pluck appends one row per scraped item.

### 2. Open Apps Script

1. In the sheet's menu: **Extensions** → **Apps Script**
2. The script editor opens with a blank `Code.gs` file

### 3. Paste this template

Replace the entire contents of `Code.gs` with:

```js
function doPost(e) {
  var payload = JSON.parse(e.postData.contents);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  // Read existing headers from row 1.
  var lastCol = sheet.getLastColumn();
  var headers = lastCol > 0
    ? sheet.getRange(1, 1, 1, lastCol).getValues()[0]
    : [];

  // If the sheet is empty (no headers yet), write Pluck's column order as headers.
  if (headers.length === 0 && payload.columns && payload.columns.length > 0) {
    sheet.getRange(1, 1, 1, payload.columns.length).setValues([payload.columns]);
    headers = payload.columns;
  }

  // Append each row in header order.
  var rowsToAppend = payload.rows.map(function (row) {
    return headers.map(function (h) { return row[h] != null ? row[h] : ''; });
  });

  if (rowsToAppend.length > 0) {
    sheet
      .getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, headers.length)
      .setValues(rowsToAppend);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, appended: rowsToAppend.length }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

### 4. Deploy as a web app

1. Click the blue **Deploy** button (top right) → **New deployment**
2. Click the gear icon next to "Select type" → **Web app**
3. Settings:
   - **Description**: `Pluck inbound`
   - **Execute as**: **Me (your-email@gmail.com)** ← important
   - **Who has access**: **Anyone** ← required for Pluck to POST
4. Click **Deploy**
5. Google will ask for permissions (your script needs access to your sheets);
   approve them
6. Copy the **Web app URL** — looks like
   `https://script.google.com/macros/s/AKfycby.../exec`

### 5. Paste into Pluck

1. Open the Pluck extension popup
2. Find the job you want to export → click ✎ (edit)
3. Check **Append rows to a Google Sheet**
4. Paste the URL from step 4
5. Click **Save**

Done. The next time the job runs (manually or scheduled), rows land in your
sheet automatically.

## Test it

In Apps Script, you can verify the deployment is working:

```bash
curl -X POST 'YOUR_WEB_APP_URL' \
  -H 'Content-Type: application/json' \
  -d '{"columns":["title","score"],"rows":[{"title":"Test","score":"42"}]}'
```

If the response is `{ "ok": true, "appended": 1 }` and a row shows up in your
sheet, you're set.

## Updating the script later

Apps Script doesn't auto-redeploy on file save. If you change the script:

1. **Deploy** → **Manage deployments** → click the pencil icon on your existing
   deployment
2. Change **Version** to **New version** → click **Deploy**

The URL stays the same.

## Security notes

- The Apps Script URL acts as a shared secret. Anyone who has it can POST rows
  to your sheet. **Don't paste it in public.**
- The script runs as YOU, so it can only write to sheets your Google account
  can access. Pluck cannot do anything else with your account.
- To rotate the URL: in **Manage deployments**, archive the old one and create
  a new deployment. Paste the new URL into Pluck.

## Troubleshooting

- **"Script function not found: doPost"** — make sure you pasted the full template
  and saved (Ctrl/Cmd-S) before deploying.
- **"Authorization required"** — re-run the deploy and approve permissions.
- **Rows show up in the wrong columns** — make sure row 1 of your sheet has
  headers that match your Pluck job's column labels exactly (case-sensitive).
- **Nothing happens after a run** — open Apps Script → **Executions** to see
  recent POSTs. If they're failing, the error is logged there.
