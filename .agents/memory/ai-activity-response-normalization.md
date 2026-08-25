---
name: AI activity response normalization
description: Preserve stable activity API responses when AI web-search output includes auxiliary structured content.
---

AI-backed activity endpoints must validate and normalize a single activity object before returning it to web or mobile clients. Do not pass through the first parsed JSON value without checking its shape.

**Why:** A real venue-redo response contained a valid activity nested inside an array of search-related text and values. The HTTP request succeeded, but the mobile client rejected the array as an incomplete activity.

**How to apply:** For any AI response that should yield one activity, search nested structured values for a named activity, validate required fields, and return a stable, normalized object. Keep the client defensive during rollout, but make the API response the canonical contract.