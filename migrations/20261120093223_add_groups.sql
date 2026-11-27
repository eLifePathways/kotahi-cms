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
ALTER TABLE "hero_section_settings" DROP CONSTRAINT "hero_section_settings_name_unique";--> statement-breakpoint
ALTER TABLE "publications" DROP CONSTRAINT "publications_kotahi_short_id_unique";--> statement-breakpoint
ALTER TABLE "what_we_do_sections" DROP CONSTRAINT "what_we_do_sections_slug_unique";--> statement-breakpoint
ALTER TABLE "hero_section_settings" ADD COLUMN "group_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "publications" ADD COLUMN "group_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "group_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "team_members" ADD COLUMN "group_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "what_we_do_sections" ADD COLUMN "group_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_section_settings" ADD CONSTRAINT "hero_section_settings_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publications" ADD CONSTRAINT "publications_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "what_we_do_sections" ADD CONSTRAINT "what_we_do_sections_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_section_settings" ADD CONSTRAINT "hero_section_settings_group_id_name_unique" UNIQUE("group_id","name");--> statement-breakpoint
ALTER TABLE "publications" ADD CONSTRAINT "publications_group_id_kotahi_short_id_unique" UNIQUE("group_id","kotahi_short_id");--> statement-breakpoint
ALTER TABLE "what_we_do_sections" ADD CONSTRAINT "what_we_do_sections_group_id_slug_unique" UNIQUE("group_id","slug");