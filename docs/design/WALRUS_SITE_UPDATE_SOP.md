# Walrus Site Update & SuiNS Linkage SOP (Standard Operating Procedure)

This document outlines the standard operating procedure for deploying updates to the Eternal Agent Brain web application on Walrus Sites and ensuring the SuiNS domain correctly points to the latest deployment.

**⚠️ CRITICAL RULE:** Always execute these steps using the **Dev Wallet**.

---

## Step 1: Build the Production Bundle
Ensure you are in the `eternal-agent-brain` directory and run the build command to generate the latest static assets in the `./dist` folder.
```bash
npm run build
```
*(If `&&` errors out, run `npx tsc -b` then `npx vite build` separately.)*

## Step 2: Push to Walrus Sites

You have two options depending on whether you want to keep the existing Site Object ID or create a new one.

### Option A: Update Existing Site (Recommended)
This is the fastest method because it **keeps the same Site Object ID**, meaning you **DO NOT** have to re-link your SuiNS domain!
1. Find your current Site Object ID (e.g., `0x761334f57cc26b2088fa3b5394b2a885e462d08bf44e4e59d0691f0dd468123d`).
2. Run the update command:
```bash
site-builder update ./dist <site-object-id> --epochs 5
```

### Option B: Publish New Site
If you want to create a brand new site object on Walrus:
```bash
site-builder publish ./dist --epochs 5
```
**Copy the `New site object ID` from the success message. You will need it for the next step.**

---

## Step 3: Verify and Update SuiNS Linkage
*(Only required if you used Option B to publish a NEW site object)*

If you generated a new Site Object ID, the SuiNS domain must be updated.

### Manual Update via SuiNS dApp
1. **Connect to SuiNS:** Open your browser and navigate to the SuiNS dApp.
2. **Ensure Dev Wallet Connection:** Verify that you are connected using the authorized **Dev Wallet**.
3. **Locate the Target Name:** Find your `.sui` name.
4. **Update the Target:** Paste the new `Site Object ID` into the designated field for the Walrus Site target (`walrus_site_id`) and approve the transaction.

### Automated Update via Script (Reference)
You can also automate this by calling the SuiNS smart contract `controller::set_user_data` directly via the `@mysten/sui` TS SDK, setting the key `"walrus_site_id"` to the new Site Object ID. *(Reference: `link-suins-walrus.ts` from the suirobo-app project).*

---

## Step 4: Verification
Wait a few moments for the Sui network to process the transaction or the Walrus portal cache to clear. 
Navigate to `https://<your-suins-name>.wal.app` in your browser to verify that the newly deployed version of the Eternal Agent Brain is live and accessible.
