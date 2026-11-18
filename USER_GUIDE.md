# User guide

How to use the public site and the admin panel of Kotahi CMS.

## Contents

1. [The public site](#the-public-site)
2. [Signing in](#signing-in)
3. [Admin panel](#admin-panel)
4. [Publications and Kotahi](#publications-and-kotahi)
5. [Other content](#other-content)
6. [Users](#users)
7. [Issue reports](#issue-reports)
8. [Analytics](#analytics)
9. [Questions](#questions)

## The public site

The menu at the top links to:

- **Home**: the home page header, followed by the "what we do" header.
- **About us**: the team and the "what we do" sections.
- **Publications**: every publication synced from Kotahi.
  - Search by title, author or words in the abstract; clear the search with
    the × in the field or by emptying it.
  - The count above the list shows how many publications match.
  - The search is part of the address, so you can bookmark or share a
    filtered list.
- **Contact**: how to get in touch.

Each publication has its own page at `/publications/<number>`, where the
number is the manuscript's Kotahi short id. It shows the manuscript and any
reviews and decision that Kotahi publishes.

The team and "what we do" pages also exist at `/team` and `/what-we-do`,
though they aren't in the menu.

## Signing in

Go to `/login` and sign in with an admin username and password. You stay
signed in for a week by default; if your session expires, you are sent back to
the sign-in page.

There is no self-registration: an existing admin creates accounts under User
Management.

## Admin panel

The sidebar links to every admin page. The dashboard shows counts and a chart
of publications by year, with shortcuts to add a team member, manage
publications and edit the home page header.

Most pages have an **Edit Page Header** button, which changes the title and
description shown at the top of the matching public page.

## Publications and Kotahi

Publications are not created in the CMS; they come from Kotahi.

### Connecting to Kotahi

1. Go to Admin → GraphQL API.
2. Enter the Kotahi GraphQL endpoint (the Kotahi address followed by
   `/graphql`), and an API key if your instance needs one.
3. Choose the group whose published manuscripts you want, and save.

The same page has a query explorer for trying out GraphQL queries against
Kotahi.

### Syncing

Go to Admin → Publications and press **Refresh Publications**. The CMS fetches
the latest published version of every manuscript in the group, with its
images, and updates the publications it already has. Run it again whenever
you publish or republish in Kotahi.

You can correct a publication's details with **Edit**, but the next sync
replaces them with Kotahi's. **Delete** removes a publication from the CMS
until the next sync brings it back.

### When reviews don't appear

Kotahi only sends review and decision fields that its forms allow to be
published. In Kotahi, edit the Review and Decision forms and set "Include when
sharing or publishing?" to **Always** on the fields you want shown, or to
**Ad hoc** and tick them when publishing. Then sync again.

## Other content

### Team members

Admin → Team Members lists everyone on the team page.

- **Add** a member with a name, title, institution, description, and
  optionally a photo, email, website and social media link.
- **Edit** or **delete** a member from the list.

Email addresses are only shown to signed-in admins.

### What we do

Admin → What We Do holds the tabbed sections shown on the about us and "what
we do" pages.

- A **section** has a title, a slug (its short name in the address), and an
  optional subtitle, description and image.
- Each section holds **content** blocks: text, a heading, a list or an image.

## Users

Admin → User Management lists the admin users. You can add a user, change a
username or password, and delete a user. Every user has full admin access.

## Issue reports

Anyone can report a problem with the bug button in the bottom-right corner of
every page. The form asks for a title and description, and optionally an email
address so you can reply. It can attach a screenshot of the page and the
browser's recent console messages.

Admin → Issue Reports lists the reports. Open one to see its details,
screenshot and console log, change its status or priority, and add comments.
You can also select several reports and delete them together.

## Analytics

Admin → Analytics shows visitors, page views, devices, traffic sources and the
most popular pages over a chosen period, and lets you reset the data.

The figures are approximate. Moving between pages inside the site isn't
counted, only full page loads, and the bounce rate is a placeholder.

## Questions

**How do I get an admin account?**
Ask an existing admin to create one under User Management.

**I changed something in Kotahi, but the site hasn't changed.**
Run Refresh Publications under Admin → Publications.

**What does Admin → Settings do?**
Nothing yet: its changes aren't saved.

**Which browsers are supported?**
Current versions of Chrome, Firefox, Safari and Edge, on desktop and mobile.
