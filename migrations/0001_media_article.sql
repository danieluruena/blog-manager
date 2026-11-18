ALTER TABLE `media` ADD `article_id` text REFERENCES articles(id) ON DELETE cascade;--> statement-breakpoint
CREATE INDEX `idx_media_article` ON `media` (`article_id`);