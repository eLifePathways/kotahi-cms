CREATE TABLE "groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"kotahi_group_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "groups_name_unique" UNIQUE("name"),
	CONSTRAINT "groups_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
-- Before groups, a database held one site's content. If there is any, it
-- becomes a group of its own: named after the old site name, with a slug made
-- from that name as shared/utils.ts slugify does ('default' when that is empty
-- or reserved), and the Kotahi group id from the old Kotahi settings. Without
-- a valid Kotahi group id there, it gets the nil UUID, to be set on the
-- group's Manage page.
INSERT INTO "groups" ("name", "slug", "kotahi_group_id")
SELECT
	"site"."name",
	CASE
		WHEN "site"."slug" = '' OR "site"."slug" IN ('admin', 'analytics', 'login', 'manage', 'users') THEN 'default'
		ELSE "site"."slug"
	END,
	"site"."kotahi_group_id"
FROM (
	SELECT
		"named"."name",
		regexp_replace(
			regexp_replace(
				regexp_replace(
					regexp_replace(lower("named"."name"), '[^a-z0-9_]+', '-', 'g'),
					'[-_]*-[-_]*', '-', 'g'
				),
				'_+', '_', 'g'
			),
			'^[-_]+|[-_]+$', '', 'g'
		) AS "slug",
		"named"."kotahi_group_id"
	FROM (
		SELECT
			coalesce(
				(
					SELECT nullif(btrim("form_data" #>> '{website,siteName}'), '')
					FROM "settings"
					WHERE "purpose" = 'general'
					LIMIT 1
				),
				'Kotahi CMS'
			) AS "name",
			coalesce(
				(
					SELECT ("form_data" ->> 'groupId')::uuid
					FROM "settings"
					WHERE "purpose" = 'kotahi'
						AND "form_data" ->> 'groupId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
					LIMIT 1
				),
				'00000000-0000-0000-0000-000000000000'::uuid
			) AS "kotahi_group_id"
	) AS "named"
) AS "site"
WHERE EXISTS (SELECT 1 FROM "hero_section_settings")
	OR EXISTS (SELECT 1 FROM "publications")
	OR EXISTS (SELECT 1 FROM "settings")
	OR EXISTS (SELECT 1 FROM "team_members")
	OR EXISTS (SELECT 1 FROM "what_we_do_sections");
--> statement-breakpoint
ALTER TABLE "hero_section_settings" DROP CONSTRAINT "hero_section_settings_name_unique";--> statement-breakpoint
ALTER TABLE "publications" DROP CONSTRAINT "publications_kotahi_short_id_unique";--> statement-breakpoint
ALTER TABLE "what_we_do_sections" DROP CONSTRAINT "what_we_do_sections_slug_unique";--> statement-breakpoint
ALTER TABLE "hero_section_settings" ADD COLUMN "group_id" uuid;--> statement-breakpoint
ALTER TABLE "publications" ADD COLUMN "group_id" uuid;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "group_id" uuid;--> statement-breakpoint
ALTER TABLE "team_members" ADD COLUMN "group_id" uuid;--> statement-breakpoint
ALTER TABLE "what_we_do_sections" ADD COLUMN "group_id" uuid;--> statement-breakpoint
-- Existing rows belong to the group made above, the only one there is.
UPDATE "hero_section_settings" SET "group_id" = (SELECT "id" FROM "groups");--> statement-breakpoint
UPDATE "publications" SET "group_id" = (SELECT "id" FROM "groups");--> statement-breakpoint
UPDATE "settings" SET "group_id" = (SELECT "id" FROM "groups");--> statement-breakpoint
UPDATE "team_members" SET "group_id" = (SELECT "id" FROM "groups");--> statement-breakpoint
UPDATE "what_we_do_sections" SET "group_id" = (SELECT "id" FROM "groups");--> statement-breakpoint
ALTER TABLE "hero_section_settings" ALTER COLUMN "group_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "publications" ALTER COLUMN "group_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "group_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "team_members" ALTER COLUMN "group_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "what_we_do_sections" ALTER COLUMN "group_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_section_settings" ADD CONSTRAINT "hero_section_settings_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publications" ADD CONSTRAINT "publications_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "what_we_do_sections" ADD CONSTRAINT "what_we_do_sections_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_section_settings" ADD CONSTRAINT "hero_section_settings_group_id_name_unique" UNIQUE("group_id","name");--> statement-breakpoint
ALTER TABLE "publications" ADD CONSTRAINT "publications_group_id_kotahi_short_id_unique" UNIQUE("group_id","kotahi_short_id");--> statement-breakpoint
ALTER TABLE "what_we_do_sections" ADD CONSTRAINT "what_we_do_sections_group_id_slug_unique" UNIQUE("group_id","slug");
