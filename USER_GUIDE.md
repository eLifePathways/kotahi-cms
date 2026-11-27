# User guide

How to use the public site and the admin panel of Kotahi CMS.

## Contents

1. [Groups and their sites](#groups-and-their-sites)
2. [The public site](#the-public-site)
3. [Signing in](#signing-in)
4. [Admin panel](#admin-panel)
5. [Managing groups](#managing-groups)
6. [Group settings](#group-settings)
7. [Publications and Kotahi](#publications-and-kotahi)
8. [Other content](#other-content)
9. [Users](#users)
10. [Issue reports](#issue-reports)
11. [Analytics](#analytics)
12. [Questions](#questions)

## Groups and their sites

The CMS can host several groups, such as journals or review communities. Each
group has a site of its own at `/<slug>` (for example `/acme-review`), with its
own content, contact details, colours, fonts and icon, and publishes from one
Kotahi group. Admin users can manage every group.

The CMS's home page, `/`, lists the active groups, each in its own colours,
fonts and logo. With only one active group, it goes straight to that group's
site.

## The public site

A group's menu links to:

- **Home**: the group's hero image, if it has one, then the home page header,
  followed by the "what we do" header.
- **About us**: the team and the "what we do" sections.
- **Publications**: every publication synced from Kotahi.
  - Search by title, author or words in the abstract; clear the search with
    the × in the field or by emptying it.
  - The count above the list shows how many publications match.
  - The search is part of the address, so you can bookmark or share a
    filtered list.
- **Contact**: the group's contact details. Only the details filled in under
  its settings are shown.

Each publication has its own page at `/<slug>/publications/<number>`, where
the number is the manuscript's Kotahi short id. It shows the manuscript and
any reviews and decision that Kotahi publishes.

The team and "what we do" pages also exist at `/<slug>/team` and
`/<slug>/what-we-do`, though they aren't in the menu.

Browser tabs show the group's name. A group that isn't active shows "Page not
found" to visitors; signed-in admins can still see it.

## Signing in

Go to `/login` and sign in with an admin username and password. You stay
signed in for a week by default; if your session expires, you are sent back to
the sign-in page.

There is no self-registration: an existing admin creates accounts under User
Management.

## Admin panel

The sidebar starts with the pages for the whole CMS:

- **Dashboard**: how many groups are active, and a list of them. If no group
  is active, a banner links to where you can add or activate one.
- **Manage Groups**, **User Management** and **Analytics**.

When you open a group, the sidebar adds a section for it, under its slug:
**Group Dashboard**, **Team Members**, **Publications**, **What We Do**,
**Issue Reports** and **Settings**. A group's admin pages use its colours and
fonts, so you see its look while you work; the pages for the whole CMS are
dark grey.

Most of a group's pages have an **Edit Page Header** button, which changes the
title and description shown at the top of the matching public page.

## Managing groups

Admin → Manage Groups lists every group with its slug (a link to its site),
Kotahi group and status. The edit button opens the group's settings.

To add a group, press **Add Group**:

1. Enter its **name**.
2. Under **Kotahi**, enter the Kotahi GraphQL endpoint (the Kotahi address
   followed by `/graphql`) and an API key if your instance needs one, and press
   **Check**. Then choose the Kotahi group it publishes from.
3. Optionally enter a **slug**, the group's address. Left empty, it's made
   from the Kotahi group's name, as previewed in the field. A slug uses
   lowercase letters and numbers, separated by single hyphens or underscores.
   `admin`, `analytics`, `login`, `manage` and `users` are taken by the CMS.
   **The slug can't be changed later.**
4. Untick **Active** to keep the site hidden from visitors until it's ready.

Creating the group takes you to its settings. It starts with default page
headers and Kotahi's colours and fonts.

## Group settings

A group's **Settings** has two tabs. Changes take effect when you save.

### Website

- **General**: the group's **name** (shown in its header and browser tabs), a
  **description** for search engines, and the **Active** switch.
- **Contact Details**: email, phone, address, office hours, and a text and
  email for media enquiries. Each is shown on the Contact page only when
  filled in.
- **Images**:
  - **Favicon**: the browser tab icon; a square image of at least 32×32px.
  - **Logo**: kept for header layouts that are coming; not shown yet.
  - **Hero image**: a wide banner across the home page, under the menu,
    cropped to fit. The switch below it hides it without removing it.
- **Appearance**:
  - **Primary colour** (buttons, headings, links, highlights) and **secondary
    colour** (supporting text, and a tint of it for light backgrounds). The
    defaults are Kotahi's.
  - **Serif font** for headings and **sans serif font** for body text. Choose
    from the list, or **Other Google Font...** to search every Google Font,
    for example to match a brand. Google may class a brand font differently
    (such as Display); check it in the preview.
  - The preview shows the colours and fonts together, and **Default colours
    and fonts** resets them.

If a colour doesn't meet the WCAG AA accessibility standard (a contrast of
4.5:1 for text), a warning shows under it, saying where it falls short and by
how much. You can still save, but some visitors may struggle to read the
site, so please consider a different colour.

### API

The group's Kotahi connection: the endpoint, API key and Kotahi group, as when
adding the group. **Check** lists the Kotahi's groups again.

## Publications and Kotahi

Publications are not created in the CMS; they come from the group's Kotahi
group. The connection is set when the group is added, and can be changed under
its Settings → API.

### Syncing

Go to the group's **Publications** and press **Refresh Publications**. The CMS
fetches the latest published version of every manuscript in the Kotahi group,
with its images, and updates the publications it already has. Run it again
whenever you publish or republish in Kotahi.

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

A group's **Team Members** lists everyone on its team page.

- **Add** a member with a name, title, institution, description, and
  optionally a photo, email, website and social media link.
- **Edit** or **delete** a member from the list.

Email addresses are only shown to signed-in admins.

### What we do

A group's **What We Do** holds the tabbed sections shown on its about us and
"what we do" pages.

- A **section** has a title, a slug (its short name in the address, unique
  within the group), and an optional subtitle, description and image.
- Each section holds **content** blocks: text, a heading, a list or an image.

## Users

Admin → User Management lists the admin users. You can add a user, change a
username or password, and delete a user. Every user has full admin access to
every group.

## Issue reports

Anyone can report a problem with the bug button in the bottom-right corner of
every page. The form asks for a title and description, and optionally an email
address so you can reply. It can attach a screenshot of the page and the
browser's recent console messages.

A group's **Issue Reports** lists the reports. Open one to see its details,
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
Run Refresh Publications under the group's Publications.

**Visitors see "Page not found" for a group's site.**
The group isn't active, or the address has the wrong slug. Check Admin →
Manage Groups; turn the group on under its Settings → Website → Active.

**Can I change a group's address?**
No: the slug is fixed when the group is created, as every link to the site
uses it. The name can be changed at any time.

**Why is there a warning under a colour?**
The colour doesn't have enough contrast to meet the WCAG AA accessibility
standard where the site uses it, which the warning lists. You can still save,
but a darker colour usually fixes it and makes the site easier to read.

**Which browsers are supported?**
Current versions of Chrome, Firefox, Safari and Edge, on desktop and mobile.
