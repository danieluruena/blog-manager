CREATE TABLE `blog_permissions` (
	`user_id` text NOT NULL,
	`blog_id` text NOT NULL,
	`permission` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `blog_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`blog_id`) REFERENCES `blogs`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "blog_permissions_permission_check" CHECK("blog_permissions"."permission" in ('read', 'write'))
);
--> statement-breakpoint
CREATE INDEX `idx_blog_permissions_blog` ON `blog_permissions` (`blog_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'admin' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`is_approved` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "users_role_check" CHECK("__new_users"."role" in ('admin', 'editor')),
	CONSTRAINT "users_is_active_check" CHECK("__new_users"."is_active" in (0, 1)),
	CONSTRAINT "users_is_approved_check" CHECK("__new_users"."is_approved" in (0, 1))
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "email", "name", "password_hash", "role", "is_active", "is_approved", "created_at", "updated_at") SELECT "id", "email", "name", "password_hash", "role", "is_active", 1, "created_at", "updated_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);