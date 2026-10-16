# ************************************************************
# Sequel Pro SQL dump
# Version 5446
#
# https://www.sequelpro.com/
# https://github.com/sequelpro/sequelpro
#
# Host: 127.0.0.1 (MySQL 8.0.36)
# Database: elmapi4
# Generation Time: 2026-08-08 06:51:11 +0000
# ************************************************************


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
SET NAMES utf8mb4;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


# Dump of table agent_conversation_messages
# ------------------------------------------------------------

DROP TABLE IF EXISTS `agent_conversation_messages`;

CREATE TABLE `agent_conversation_messages` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `conversation_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `participant_type` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `participant_id` bigint unsigned DEFAULT NULL,
  `agent` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(25) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `attachments` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `tool_calls` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `tool_results` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `usage` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `meta` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `approval_state` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `conversation_index` (`conversation_id`,`participant_type`,`participant_id`,`updated_at`),
  KEY `participant_index` (`participant_type`,`participant_id`),
  KEY `agent_conversation_messages_conversation_id_index` (`conversation_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table agent_conversations
# ------------------------------------------------------------

DROP TABLE IF EXISTS `agent_conversations`;

CREATE TABLE `agent_conversations` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `participant_type` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `participant_id` bigint unsigned DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `context` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `participant_updated_at_index` (`participant_type`,`participant_id`,`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table app_settings
# ------------------------------------------------------------

DROP TABLE IF EXISTS `app_settings`;

CREATE TABLE `app_settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `app_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `font_family` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `theme_radius` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `theme_tokens` json DEFAULT NULL,
  `theme_preset_key` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `theme_custom_tokens` json DEFAULT NULL,
  `logo_file` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `favicon_file` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `ai_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `ai_provider` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'anthropic',
  `ai_model` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ai_show_token_usage` tinyint(1) NOT NULL DEFAULT '0',
  `ai_max_conversation_messages` smallint unsigned NOT NULL DEFAULT '10',
  `ai_max_tokens` int unsigned NOT NULL DEFAULT '4096',
  `ai_max_steps` smallint unsigned NOT NULL DEFAULT '8',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table asset_metadata
# ------------------------------------------------------------

DROP TABLE IF EXISTS `asset_metadata`;

CREATE TABLE `asset_metadata` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `asset_id` bigint unsigned NOT NULL,
  `width` int DEFAULT NULL,
  `height` int DEFAULT NULL,
  `duration` int DEFAULT NULL,
  `bitrate` int DEFAULT NULL,
  `framerate` double DEFAULT NULL,
  `channels` int DEFAULT NULL,
  `alt_text` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `caption` text COLLATE utf8mb4_unicode_ci,
  `description` text COLLATE utf8mb4_unicode_ci,
  `author` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `copyright` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `asset_metadata_asset_id_unique` (`asset_id`),
  CONSTRAINT `asset_metadata_asset_id_foreign` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table asset_upload_intents
# ------------------------------------------------------------

DROP TABLE IF EXISTS `asset_upload_intents`;

CREATE TABLE `asset_upload_intents` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `project_id` bigint unsigned NOT NULL,
  `storage_key` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_filename` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `client_mime_type` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `max_bytes` bigint unsigned NOT NULL,
  `mode` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'single_put',
  `s3_multipart_upload_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expires_at` timestamp NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `asset_upload_intents_uuid_unique` (`uuid`),
  KEY `asset_upload_intents_project_id_expires_at_index` (`project_id`,`expires_at`),
  CONSTRAINT `asset_upload_intents_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table assets
# ------------------------------------------------------------

DROP TABLE IF EXISTS `assets`;

CREATE TABLE `assets` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `project_id` bigint unsigned NOT NULL,
  `filename` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_filename` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `extension` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `size` bigint NOT NULL,
  `disk` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'local',
  `path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pending_image_processing` tinyint(1) NOT NULL DEFAULT '0',
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `assets_uuid_unique` (`uuid`),
  KEY `assets_created_by_foreign` (`created_by`),
  KEY `assets_updated_by_foreign` (`updated_by`),
  KEY `assets_project_id_index` (`project_id`),
  KEY `assets_extension_index` (`extension`),
  CONSTRAINT `assets_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `assets_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `assets_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table cache
# ------------------------------------------------------------

DROP TABLE IF EXISTS `cache`;

CREATE TABLE `cache` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table cache_locks
# ------------------------------------------------------------

DROP TABLE IF EXISTS `cache_locks`;

CREATE TABLE `cache_locks` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table collection_fields
# ------------------------------------------------------------

DROP TABLE IF EXISTS `collection_fields`;

CREATE TABLE `collection_fields` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `project_id` bigint unsigned NOT NULL,
  `collection_id` bigint unsigned NOT NULL,
  `parent_field_id` bigint unsigned DEFAULT NULL,
  `type` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `placeholder` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `order` int DEFAULT NULL,
  `options` json DEFAULT NULL,
  `validations` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `collection_fields_uuid_unique` (`uuid`),
  UNIQUE KEY `collection_fields_collection_parent_name_unique` (`collection_id`,`parent_field_id`,`name`),
  KEY `collection_fields_project_id_foreign` (`project_id`),
  KEY `collection_fields_parent_field_id_foreign` (`parent_field_id`),
  CONSTRAINT `collection_fields_collection_id_foreign` FOREIGN KEY (`collection_id`) REFERENCES `collections` (`id`) ON DELETE CASCADE,
  CONSTRAINT `collection_fields_parent_field_id_foreign` FOREIGN KEY (`parent_field_id`) REFERENCES `collection_fields` (`id`) ON DELETE CASCADE,
  CONSTRAINT `collection_fields_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table collection_template_fields
# ------------------------------------------------------------

DROP TABLE IF EXISTS `collection_template_fields`;

CREATE TABLE `collection_template_fields` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `collection_template_id` bigint unsigned NOT NULL,
  `type` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `placeholder` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `order` int DEFAULT NULL,
  `options` json DEFAULT NULL,
  `validations` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `collection_template_fields_uuid_unique` (`uuid`),
  KEY `collection_template_fields_collection_template_id_foreign` (`collection_template_id`),
  CONSTRAINT `collection_template_fields_collection_template_id_foreign` FOREIGN KEY (`collection_template_id`) REFERENCES `collection_templates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

LOCK TABLES `collection_template_fields` WRITE;
/*!40000 ALTER TABLE `collection_template_fields` DISABLE KEYS */;

INSERT INTO `collection_template_fields` (`id`, `uuid`, `collection_template_id`, `type`, `label`, `name`, `description`, `placeholder`, `order`, `options`, `validations`, `created_at`, `updated_at`, `deleted_at`)
VALUES
	(1,'b0d78479-dd09-4727-9317-35ee9ace8bb1',1,'text','Title','title',NULL,NULL,1,'{\"repeatable\": false, \"hiddenInAPI\": false, \"hideInContentList\": false}','{\"color\": {\"message\": null}, \"email\": {\"message\": null}, \"number\": {\"message\": null}, \"unique\": {\"status\": false, \"message\": null}, \"required\": {\"status\": false, \"message\": null}, \"charcount\": {\"max\": null, \"min\": null, \"type\": null, \"status\": false, \"message\": null}}','2026-08-08 06:50:53','2026-08-08 06:50:53',NULL),
	(2,'55798cf0-ed66-486c-8c91-50b2f3c66b27',1,'slug','Slug','slug',NULL,NULL,2,'{\"slug\": {\"field\": \"title\", \"readonly\": true}}','{\"color\": {\"message\": null}, \"email\": {\"message\": null}, \"number\": {\"message\": null}, \"unique\": {\"status\": false, \"message\": null}, \"required\": {\"status\": false, \"message\": null}, \"charcount\": {\"max\": null, \"min\": null, \"type\": null, \"status\": false, \"message\": null}}','2026-08-08 06:50:53','2026-08-08 06:50:53',NULL),
	(3,'f9be89e4-41d4-4eaa-a3d4-1fd87c780140',1,'richtext','Content','content',NULL,NULL,3,'{\"repeatable\": false, \"hiddenInAPI\": false, \"hideInContentList\": false}','{\"color\": {\"message\": null}, \"email\": {\"message\": null}, \"number\": {\"message\": null}, \"unique\": {\"status\": false, \"message\": null}, \"required\": {\"status\": false, \"message\": null}, \"charcount\": {\"max\": null, \"min\": null, \"type\": null, \"status\": false, \"message\": null}}','2026-08-08 06:50:53','2026-08-08 06:50:53',NULL),
	(4,'9ed33d2b-90a7-4426-bf36-820492fae2a5',2,'text','Name','name',NULL,NULL,1,'{\"repeatable\": false, \"hiddenInAPI\": false, \"hideInContentList\": false}','{\"color\": {\"message\": null}, \"email\": {\"message\": null}, \"number\": {\"message\": null}, \"unique\": {\"status\": false, \"message\": null}, \"required\": {\"status\": false, \"message\": null}, \"charcount\": {\"max\": null, \"min\": null, \"type\": null, \"status\": false, \"message\": null}}','2026-08-08 06:50:53','2026-08-08 06:50:53',NULL),
	(5,'ce7c97d6-7662-4809-833e-25b9026b0e30',2,'slug','Slug','slug',NULL,NULL,2,'{\"slug\": {\"field\": \"name\", \"readonly\": true}}','{\"color\": {\"message\": null}, \"email\": {\"message\": null}, \"number\": {\"message\": null}, \"unique\": {\"status\": false, \"message\": null}, \"required\": {\"status\": false, \"message\": null}, \"charcount\": {\"max\": null, \"min\": null, \"type\": null, \"status\": false, \"message\": null}}','2026-08-08 06:50:53','2026-08-08 06:50:53',NULL),
	(6,'480e8dfb-ca69-4864-bd07-83f6b8b8d9f5',2,'number','Price','price',NULL,NULL,3,'{\"repeatable\": false, \"hiddenInAPI\": false, \"hideInContentList\": false}','{\"color\": {\"message\": null}, \"email\": {\"message\": null}, \"number\": {\"message\": null}, \"unique\": {\"status\": false, \"message\": null}, \"required\": {\"status\": false, \"message\": null}, \"charcount\": {\"max\": null, \"min\": null, \"type\": null, \"status\": false, \"message\": null}}','2026-08-08 06:50:53','2026-08-08 06:50:53',NULL),
	(7,'2b786048-6ad2-4c55-be3b-e9fc8ee66029',2,'media','Images','images',NULL,NULL,4,'{\"multiple\": true}','{\"color\": {\"message\": null}, \"email\": {\"message\": null}, \"number\": {\"message\": null}, \"unique\": {\"status\": false, \"message\": null}, \"required\": {\"status\": false, \"message\": null}, \"charcount\": {\"max\": null, \"min\": null, \"type\": null, \"status\": false, \"message\": null}}','2026-08-08 06:50:53','2026-08-08 06:50:53',NULL);

/*!40000 ALTER TABLE `collection_template_fields` ENABLE KEYS */;
UNLOCK TABLES;


# Dump of table collection_templates
# ------------------------------------------------------------

DROP TABLE IF EXISTS `collection_templates`;

CREATE TABLE `collection_templates` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_singleton` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `collection_templates_uuid_unique` (`uuid`),
  UNIQUE KEY `collection_templates_slug_unique` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

LOCK TABLES `collection_templates` WRITE;
/*!40000 ALTER TABLE `collection_templates` DISABLE KEYS */;

INSERT INTO `collection_templates` (`id`, `uuid`, `name`, `slug`, `description`, `is_singleton`, `created_at`, `updated_at`, `deleted_at`)
VALUES
	(1,'3328b7a7-9328-4323-9aa6-fc85e8394b01','Blog Post','blog-post','Template for blog posts',0,'2026-08-08 06:50:53','2026-08-08 06:50:53',NULL),
	(2,'bb5e8c02-0c41-4f21-8b4c-490ade225006','Product','product','Template for products',0,'2026-08-08 06:50:53','2026-08-08 06:50:53',NULL);

/*!40000 ALTER TABLE `collection_templates` ENABLE KEYS */;
UNLOCK TABLES;


# Dump of table collections
# ------------------------------------------------------------

DROP TABLE IF EXISTS `collections`;

CREATE TABLE `collections` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `project_id` bigint unsigned NOT NULL,
  `name` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `order` int DEFAULT NULL,
  `is_singleton` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `collections_project_id_slug_unique` (`project_id`,`slug`),
  UNIQUE KEY `collections_uuid_unique` (`uuid`),
  CONSTRAINT `collections_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table content_entries
# ------------------------------------------------------------

DROP TABLE IF EXISTS `content_entries`;

CREATE TABLE `content_entries` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `project_id` bigint unsigned NOT NULL,
  `collection_id` bigint unsigned NOT NULL,
  `locale` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `translation_group_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `state` enum('draft','published') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `published_at` timestamp NULL DEFAULT NULL,
  `published_version_id` bigint unsigned DEFAULT NULL,
  `published_version_number` int unsigned DEFAULT NULL,
  `is_draft_dirty` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `content_entries_uuid_unique` (`uuid`),
  KEY `content_entries_collection_id_foreign` (`collection_id`),
  KEY `content_entries_created_by_foreign` (`created_by`),
  KEY `content_entries_updated_by_foreign` (`updated_by`),
  KEY `content_entries_project_id_collection_id_index` (`project_id`,`collection_id`),
  KEY `content_entries_state_locale_index` (`state`,`locale`),
  KEY `content_entries_translation_group_id_index` (`translation_group_id`),
  KEY `content_entries_published_version_id_index` (`published_version_id`),
  CONSTRAINT `content_entries_collection_id_foreign` FOREIGN KEY (`collection_id`) REFERENCES `collections` (`id`) ON DELETE CASCADE,
  CONSTRAINT `content_entries_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `content_entries_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `content_entries_published_version_id_foreign` FOREIGN KEY (`published_version_id`) REFERENCES `content_entry_versions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `content_entries_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table content_entry_versions
# ------------------------------------------------------------

DROP TABLE IF EXISTS `content_entry_versions`;

CREATE TABLE `content_entry_versions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content_entry_id` bigint unsigned NOT NULL,
  `project_id` bigint unsigned NOT NULL,
  `collection_id` bigint unsigned NOT NULL,
  `locale` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `translation_group_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `version_number` int unsigned NOT NULL,
  `label` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `snapshot` json NOT NULL,
  `published_at` timestamp NULL DEFAULT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `content_entry_versions_entry_number_unique` (`content_entry_id`,`version_number`),
  UNIQUE KEY `content_entry_versions_uuid_unique` (`uuid`),
  KEY `content_entry_versions_project_id_index` (`project_id`),
  KEY `content_entry_versions_collection_id_index` (`collection_id`),
  KEY `content_entry_versions_content_entry_id_version_number_index` (`content_entry_id`,`version_number`),
  KEY `content_entry_versions_translation_group_id_index` (`translation_group_id`),
  CONSTRAINT `content_entry_versions_collection_id_foreign` FOREIGN KEY (`collection_id`) REFERENCES `collections` (`id`) ON DELETE CASCADE,
  CONSTRAINT `content_entry_versions_content_entry_id_foreign` FOREIGN KEY (`content_entry_id`) REFERENCES `content_entries` (`id`) ON DELETE CASCADE,
  CONSTRAINT `content_entry_versions_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table content_field_groups
# ------------------------------------------------------------

DROP TABLE IF EXISTS `content_field_groups`;

CREATE TABLE `content_field_groups` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `project_id` bigint unsigned NOT NULL,
  `collection_id` bigint unsigned NOT NULL,
  `content_entry_id` bigint unsigned NOT NULL,
  `field_id` bigint unsigned NOT NULL,
  `sort_order` int unsigned NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `content_field_groups_uuid_unique` (`uuid`),
  KEY `content_field_groups_project_id_foreign` (`project_id`),
  KEY `content_field_groups_collection_id_foreign` (`collection_id`),
  KEY `content_field_groups_field_id_foreign` (`field_id`),
  KEY `content_field_groups_content_entry_id_field_id_index` (`content_entry_id`,`field_id`),
  CONSTRAINT `content_field_groups_collection_id_foreign` FOREIGN KEY (`collection_id`) REFERENCES `collections` (`id`) ON DELETE CASCADE,
  CONSTRAINT `content_field_groups_content_entry_id_foreign` FOREIGN KEY (`content_entry_id`) REFERENCES `content_entries` (`id`) ON DELETE CASCADE,
  CONSTRAINT `content_field_groups_field_id_foreign` FOREIGN KEY (`field_id`) REFERENCES `collection_fields` (`id`) ON DELETE CASCADE,
  CONSTRAINT `content_field_groups_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table content_field_values
# ------------------------------------------------------------

DROP TABLE IF EXISTS `content_field_values`;

CREATE TABLE `content_field_values` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `project_id` bigint unsigned NOT NULL,
  `collection_id` bigint unsigned NOT NULL,
  `content_entry_id` bigint unsigned NOT NULL,
  `group_instance_id` bigint unsigned DEFAULT NULL,
  `field_id` bigint unsigned NOT NULL,
  `field_type` enum('text','longtext','richtext','slug','email','password','number','enumeration','boolean','color','date','time','datetime','media','relation','json') COLLATE utf8mb4_unicode_ci NOT NULL,
  `text_value` text COLLATE utf8mb4_unicode_ci,
  `number_value` decimal(20,6) DEFAULT NULL,
  `boolean_value` tinyint(1) DEFAULT NULL,
  `date_value` date DEFAULT NULL,
  `date_value_end` date DEFAULT NULL,
  `datetime_value` timestamp NULL DEFAULT NULL,
  `datetime_value_end` timestamp NULL DEFAULT NULL,
  `json_value` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `content_field_values_project_id_foreign` (`project_id`),
  KEY `content_field_values_collection_id_foreign` (`collection_id`),
  KEY `content_field_values_field_id_foreign` (`field_id`),
  KEY `content_field_values_content_entry_id_field_id_index` (`content_entry_id`,`field_id`),
  KEY `content_field_values_field_type_number_value_index` (`field_type`,`number_value`),
  KEY `content_field_values_field_type_date_value_index` (`field_type`,`date_value`),
  KEY `content_field_values_field_type_date_value_end_index` (`field_type`,`date_value_end`),
  KEY `content_field_values_field_type_datetime_value_index` (`field_type`,`datetime_value`),
  KEY `content_field_values_field_type_datetime_value_end_index` (`field_type`,`datetime_value_end`),
  KEY `content_field_values_field_type_boolean_value_index` (`field_type`,`boolean_value`),
  KEY `content_field_values_field_type_text_value_index` (`field_type`,`text_value`(191)),
  KEY `content_field_values_group_instance_id_foreign` (`group_instance_id`),
  CONSTRAINT `content_field_values_collection_id_foreign` FOREIGN KEY (`collection_id`) REFERENCES `collections` (`id`) ON DELETE CASCADE,
  CONSTRAINT `content_field_values_content_entry_id_foreign` FOREIGN KEY (`content_entry_id`) REFERENCES `content_entries` (`id`) ON DELETE CASCADE,
  CONSTRAINT `content_field_values_field_id_foreign` FOREIGN KEY (`field_id`) REFERENCES `collection_fields` (`id`) ON DELETE CASCADE,
  CONSTRAINT `content_field_values_group_instance_id_foreign` FOREIGN KEY (`group_instance_id`) REFERENCES `content_field_groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `content_field_values_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table content_media_relations
# ------------------------------------------------------------

DROP TABLE IF EXISTS `content_media_relations`;

CREATE TABLE `content_media_relations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `field_value_id` bigint unsigned NOT NULL,
  `asset_id` bigint unsigned NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `content_media_relations_field_value_id_index` (`field_value_id`),
  KEY `content_media_relations_asset_id_index` (`asset_id`),
  CONSTRAINT `content_media_relations_asset_id_foreign` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `content_media_relations_field_value_id_foreign` FOREIGN KEY (`field_value_id`) REFERENCES `content_field_values` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table content_relation_field_relations
# ------------------------------------------------------------

DROP TABLE IF EXISTS `content_relation_field_relations`;

CREATE TABLE `content_relation_field_relations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `field_value_id` bigint unsigned NOT NULL,
  `related_id` bigint unsigned NOT NULL,
  `related_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `content_relation_field_relations_field_value_id_index` (`field_value_id`),
  KEY `content_relation_field_relations_related_id_related_type_index` (`related_id`,`related_type`),
  CONSTRAINT `content_relation_field_relations_field_value_id_foreign` FOREIGN KEY (`field_value_id`) REFERENCES `content_field_values` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table failed_jobs
# ------------------------------------------------------------

DROP TABLE IF EXISTS `failed_jobs`;

CREATE TABLE `failed_jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `connection` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `queue` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `exception` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table job_batches
# ------------------------------------------------------------

DROP TABLE IF EXISTS `job_batches`;

CREATE TABLE `job_batches` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_jobs` int NOT NULL,
  `pending_jobs` int NOT NULL,
  `failed_jobs` int NOT NULL,
  `failed_job_ids` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `options` mediumtext COLLATE utf8mb4_unicode_ci,
  `cancelled_at` int DEFAULT NULL,
  `created_at` int NOT NULL,
  `finished_at` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table jobs
# ------------------------------------------------------------

DROP TABLE IF EXISTS `jobs`;

CREATE TABLE `jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempts` tinyint NOT NULL,
  `reserved_at` int DEFAULT NULL,
  `available_at` int NOT NULL,
  `created_at` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table migrations
# ------------------------------------------------------------

DROP TABLE IF EXISTS `migrations`;

CREATE TABLE `migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;

INSERT INTO `migrations` (`id`, `migration`, `batch`)
VALUES
	(1,'0001_01_01_000000_create_users_table',1),
	(2,'0001_01_01_000001_create_cache_table',1),
	(3,'0001_01_01_000002_create_jobs_table',1),
	(4,'2025_05_02_100349_create_projects_table',1),
	(5,'2025_05_04_112002_create_collections_table',1),
	(6,'2025_05_04_151145_create_collection_fields_table',1),
	(7,'2025_05_10_092656_create_assets_table',1),
	(8,'2025_05_10_092705_create_asset_metadata_table',1),
	(9,'2025_05_10_133739_create_permission_tables',1),
	(10,'2025_05_19_140200_create_content_entries_table',1),
	(11,'2025_05_19_140335_create_content_field_values_table',1),
	(12,'2025_05_19_140341_create_content_media_relations_table',1),
	(13,'2025_05_19_140406_create_content_relation_field_relations_table',1),
	(14,'2025_06_29_000000_create_collection_templates_tables',1),
	(15,'2025_06_30_000000_create_project_user_table',1),
	(16,'2025_07_01_111010_create_personal_access_tokens_table',1),
	(17,'2025_07_02_000000_create_webhooks_table',1),
	(18,'2025_07_02_000001_create_webhook_collections_table',1),
	(19,'2025_07_02_000002_create_webhook_logs_table',1),
	(20,'2025_07_06_000000_create_project_templates_table',1),
	(21,'2025_08_08_120000_create_app_settings_table',1),
	(22,'2025_11_12_000000_add_field_groups_support',1),
	(23,'2025_11_18_133809_add_translation_group_id_to_content_entries_table',1),
	(24,'2025_11_20_071624_fix_collection_fields_unique_constraint',1),
	(25,'2026_02_08_111023_create_agent_conversations_table',1),
	(26,'2026_02_08_163855_add_ai_settings_to_app_settings_table',1),
	(27,'2026_03_12_112749_add_original_path_to_assets_table',1),
	(28,'2026_03_12_115727_add_unique_index_to_asset_metadata_asset_id',1),
	(29,'2026_03_12_120000_add_font_family_to_app_settings_table',1),
	(30,'2026_03_12_154744_create_project_auth_users_table',1),
	(31,'2026_03_12_154745_create_project_auth_identities_table',1),
	(32,'2026_03_12_154746_create_project_auth_refresh_tokens_table',1),
	(33,'2026_03_12_154746_create_project_auth_sessions_table',1),
	(34,'2026_03_12_154747_create_project_auth_audit_events_table',1),
	(35,'2026_03_12_154747_create_project_auth_jwt_keys_table',1),
	(36,'2026_03_12_163542_add_project_auth_session_foreign_to_refresh_tokens_table',1),
	(37,'2026_03_12_164948_create_project_auth_authorization_codes_table',1),
	(38,'2026_03_12_164948_create_project_auth_clients_table',1),
	(39,'2026_03_12_165505_add_project_auth_client_foreign_to_authorization_codes_table',1),
	(40,'2026_03_12_180000_add_theme_tokens_to_app_settings_table',1),
	(41,'2026_03_12_190000_add_theme_preset_fields_to_app_settings_table',1),
	(42,'2026_03_13_113825_add_suspended_at_to_project_auth_users_table',1),
	(43,'2026_03_13_135413_create_project_auth_api_keys_table',1),
	(44,'2026_03_13_160513_add_project_auth_verification_settings_to_projects_table',1),
	(45,'2026_03_13_160513_create_project_auth_email_verification_tokens_table',1),
	(46,'2026_03_13_184359_rename_status_to_state_on_content_entries_table',1),
	(47,'2026_03_20_084039_add_uuid_to_webhooks_table',1),
	(48,'2026_07_30_195828_create_asset_upload_intents_and_direct_upload_columns',1),
	(49,'2026_07_30_200000_create_content_entry_versions_table',1),
	(50,'2026_07_30_210314_migrate_agent_conversations_to_participant_morph',1),
	(51,'2026_07_31_110426_remove_obsolete_project_templates',1),
	(52,'2026_08_04_150137_add_theme_radius_to_app_settings_table',1),
	(53,'2026_08_04_193952_add_access_auth_settings_permission',1),
	(54,'2026_08_07_160143_add_preview_url_to_projects_table',1);

/*!40000 ALTER TABLE `migrations` ENABLE KEYS */;
UNLOCK TABLES;


# Dump of table model_has_permissions
# ------------------------------------------------------------

DROP TABLE IF EXISTS `model_has_permissions`;

CREATE TABLE `model_has_permissions` (
  `permission_id` bigint unsigned NOT NULL,
  `model_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `model_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`permission_id`,`model_id`,`model_type`),
  KEY `model_has_permissions_model_id_model_type_index` (`model_id`,`model_type`),
  CONSTRAINT `model_has_permissions_permission_id_foreign` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table model_has_roles
# ------------------------------------------------------------

DROP TABLE IF EXISTS `model_has_roles`;

CREATE TABLE `model_has_roles` (
  `role_id` bigint unsigned NOT NULL,
  `model_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `model_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`role_id`,`model_id`,`model_type`),
  KEY `model_has_roles_model_id_model_type_index` (`model_id`,`model_type`),
  CONSTRAINT `model_has_roles_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

LOCK TABLES `model_has_roles` WRITE;
/*!40000 ALTER TABLE `model_has_roles` DISABLE KEYS */;

INSERT INTO `model_has_roles` (`role_id`, `model_type`, `model_id`)
VALUES
	(1,'App\\Models\\User',1);

/*!40000 ALTER TABLE `model_has_roles` ENABLE KEYS */;
UNLOCK TABLES;


# Dump of table password_reset_tokens
# ------------------------------------------------------------

DROP TABLE IF EXISTS `password_reset_tokens`;

CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table permissions
# ------------------------------------------------------------

DROP TABLE IF EXISTS `permissions`;

CREATE TABLE `permissions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `guard_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `permissions_name_guard_name_unique` (`name`,`guard_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;

INSERT INTO `permissions` (`id`, `name`, `guard_name`, `created_at`, `updated_at`)
VALUES
	(1,'access_auth_settings','web','2026-08-08 06:50:52','2026-08-08 06:50:52'),
	(2,'access_users','web','2026-08-08 06:50:52','2026-08-08 06:50:52'),
	(3,'create_users','web','2026-08-08 06:50:52','2026-08-08 06:50:52'),
	(4,'update_users','web','2026-08-08 06:50:52','2026-08-08 06:50:52'),
	(5,'delete_users','web','2026-08-08 06:50:52','2026-08-08 06:50:52'),
	(6,'access_roles','web','2026-08-08 06:50:52','2026-08-08 06:50:52'),
	(7,'create_roles','web','2026-08-08 06:50:52','2026-08-08 06:50:52'),
	(8,'update_roles','web','2026-08-08 06:50:52','2026-08-08 06:50:52'),
	(9,'delete_roles','web','2026-08-08 06:50:52','2026-08-08 06:50:52'),
	(10,'access_permissions','web','2026-08-08 06:50:52','2026-08-08 06:50:52'),
	(11,'create_permissions','web','2026-08-08 06:50:52','2026-08-08 06:50:52'),
	(12,'update_permissions','web','2026-08-08 06:50:52','2026-08-08 06:50:52'),
	(13,'delete_permissions','web','2026-08-08 06:50:52','2026-08-08 06:50:52'),
	(14,'access_all_projects','web','2026-08-08 06:50:52','2026-08-08 06:50:52'),
	(15,'create_project','web','2026-08-08 06:50:52','2026-08-08 06:50:52'),
	(16,'create_collection','web','2026-08-08 06:50:52','2026-08-08 06:50:52'),
	(17,'access_collection_settings','web','2026-08-08 06:50:52','2026-08-08 06:50:52'),
	(18,'update_collection','web','2026-08-08 06:50:52','2026-08-08 06:50:52'),
	(19,'delete_collection','web','2026-08-08 06:50:52','2026-08-08 06:50:52'),
	(20,'create_field','web','2026-08-08 06:50:52','2026-08-08 06:50:52'),
	(21,'update_field','web','2026-08-08 06:50:52','2026-08-08 06:50:52'),
	(22,'delete_field','web','2026-08-08 06:50:52','2026-08-08 06:50:52'),
	(23,'access_project_settings','web','2026-08-08 06:50:52','2026-08-08 06:50:52'),
	(24,'delete_project','web','2026-08-08 06:50:52','2026-08-08 06:50:52'),
	(25,'access_localization_settings','web','2026-08-08 06:50:52','2026-08-08 06:50:52'),
	(26,'access_user_access_settings','web','2026-08-08 06:50:52','2026-08-08 06:50:52'),
	(27,'access_api_access_settings','web','2026-08-08 06:50:52','2026-08-08 06:50:52'),
	(28,'access_webhooks_settings','web','2026-08-08 06:50:52','2026-08-08 06:50:52'),
	(29,'create_content','web','2026-08-08 06:50:52','2026-08-08 06:50:52'),
	(30,'update_content','web','2026-08-08 06:50:52','2026-08-08 06:50:52'),
	(31,'publish_content','web','2026-08-08 06:50:52','2026-08-08 06:50:52'),
	(32,'unpublish_content','web','2026-08-08 06:50:52','2026-08-08 06:50:52'),
	(33,'move_content_to_trash','web','2026-08-08 06:50:52','2026-08-08 06:50:52'),
	(34,'delete_content','web','2026-08-08 06:50:52','2026-08-08 06:50:52'),
	(35,'access_assets','web','2026-08-08 06:50:52','2026-08-08 06:50:52'),
	(36,'upload_asset','web','2026-08-08 06:50:52','2026-08-08 06:50:52'),
	(37,'update_asset','web','2026-08-08 06:50:53','2026-08-08 06:50:53'),
	(38,'delete_asset','web','2026-08-08 06:50:53','2026-08-08 06:50:53');

/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;
UNLOCK TABLES;


# Dump of table personal_access_tokens
# ------------------------------------------------------------

DROP TABLE IF EXISTS `personal_access_tokens`;

CREATE TABLE `personal_access_tokens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokenable_id` bigint unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `abilities` text COLLATE utf8mb4_unicode_ci,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table project_auth_api_keys
# ------------------------------------------------------------

DROP TABLE IF EXISTS `project_auth_api_keys`;

CREATE TABLE `project_auth_api_keys` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `project_id` bigint unsigned NOT NULL,
  `project_auth_user_id` bigint unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `key_prefix` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `key_hash` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `scopes` json DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `revoked_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `project_auth_api_keys_key_hash_unique` (`key_hash`),
  KEY `paak_project_user_idx` (`project_id`,`project_auth_user_id`),
  KEY `paak_project_revoked_idx` (`project_id`,`revoked_at`),
  KEY `paak_user_expires_idx` (`project_auth_user_id`,`expires_at`),
  CONSTRAINT `project_auth_api_keys_project_auth_user_id_foreign` FOREIGN KEY (`project_auth_user_id`) REFERENCES `project_auth_users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `project_auth_api_keys_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table project_auth_audit_events
# ------------------------------------------------------------

DROP TABLE IF EXISTS `project_auth_audit_events`;

CREATE TABLE `project_auth_audit_events` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `project_id` bigint unsigned NOT NULL,
  `project_auth_user_id` bigint unsigned DEFAULT NULL,
  `project_auth_session_id` bigint unsigned DEFAULT NULL,
  `event_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `request_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `risk_flags` json DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `occurred_at` timestamp NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `project_auth_audit_events_project_auth_session_id_foreign` (`project_auth_session_id`),
  KEY `paae_project_event_occurred_idx` (`project_id`,`event_type`,`occurred_at`),
  KEY `paae_user_occurred_idx` (`project_auth_user_id`,`occurred_at`),
  CONSTRAINT `project_auth_audit_events_project_auth_session_id_foreign` FOREIGN KEY (`project_auth_session_id`) REFERENCES `project_auth_sessions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `project_auth_audit_events_project_auth_user_id_foreign` FOREIGN KEY (`project_auth_user_id`) REFERENCES `project_auth_users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `project_auth_audit_events_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table project_auth_authorization_codes
# ------------------------------------------------------------

DROP TABLE IF EXISTS `project_auth_authorization_codes`;

CREATE TABLE `project_auth_authorization_codes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `project_id` bigint unsigned NOT NULL,
  `project_auth_user_id` bigint unsigned NOT NULL,
  `project_auth_session_id` bigint unsigned DEFAULT NULL,
  `project_auth_client_id` bigint unsigned NOT NULL,
  `code_hash` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `redirect_uri` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code_challenge` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code_challenge_method` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'S256',
  `scopes` json DEFAULT NULL,
  `expires_at` timestamp NOT NULL,
  `consumed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `project_auth_authorization_codes_code_hash_unique` (`code_hash`),
  KEY `paac_project_client_idx` (`project_id`,`project_auth_client_id`),
  KEY `paac_user_expires_idx` (`project_auth_user_id`,`expires_at`),
  KEY `project_auth_authorization_codes_project_auth_client_id_foreign` (`project_auth_client_id`),
  CONSTRAINT `project_auth_authorization_codes_project_auth_client_id_foreign` FOREIGN KEY (`project_auth_client_id`) REFERENCES `project_auth_clients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `project_auth_authorization_codes_project_auth_user_id_foreign` FOREIGN KEY (`project_auth_user_id`) REFERENCES `project_auth_users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `project_auth_authorization_codes_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table project_auth_clients
# ------------------------------------------------------------

DROP TABLE IF EXISTS `project_auth_clients`;

CREATE TABLE `project_auth_clients` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `project_id` bigint unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `client_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `client_secret_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `redirect_uris` json NOT NULL,
  `allowed_scopes` json DEFAULT NULL,
  `is_confidential` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `project_auth_clients_client_id_unique` (`client_id`),
  KEY `pac_project_active_idx` (`project_id`,`is_active`),
  CONSTRAINT `project_auth_clients_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table project_auth_email_verification_tokens
# ------------------------------------------------------------

DROP TABLE IF EXISTS `project_auth_email_verification_tokens`;

CREATE TABLE `project_auth_email_verification_tokens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `project_id` bigint unsigned NOT NULL,
  `project_auth_user_id` bigint unsigned NOT NULL,
  `token_hash` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` timestamp NOT NULL,
  `consumed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `project_auth_email_verification_tokens_token_hash_unique` (`token_hash`),
  KEY `paevt_project_user_idx` (`project_id`,`project_auth_user_id`),
  KEY `paevt_user_expires_idx` (`project_auth_user_id`,`expires_at`),
  CONSTRAINT `paevt_project_fk` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `paevt_user_fk` FOREIGN KEY (`project_auth_user_id`) REFERENCES `project_auth_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table project_auth_identities
# ------------------------------------------------------------

DROP TABLE IF EXISTS `project_auth_identities`;

CREATE TABLE `project_auth_identities` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `project_id` bigint unsigned NOT NULL,
  `project_auth_user_id` bigint unsigned NOT NULL,
  `provider` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider_subject` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `provider_data` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `project_auth_identity_provider_unique` (`project_id`,`provider`,`provider_subject`),
  KEY `project_auth_identities_project_auth_user_id_provider_index` (`project_auth_user_id`,`provider`),
  CONSTRAINT `project_auth_identities_project_auth_user_id_foreign` FOREIGN KEY (`project_auth_user_id`) REFERENCES `project_auth_users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `project_auth_identities_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table project_auth_jwt_keys
# ------------------------------------------------------------

DROP TABLE IF EXISTS `project_auth_jwt_keys`;

CREATE TABLE `project_auth_jwt_keys` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `project_id` bigint unsigned NOT NULL,
  `kid` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `algorithm` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'HS256',
  `public_key` text COLLATE utf8mb4_unicode_ci,
  `private_key` text COLLATE utf8mb4_unicode_ci,
  `secret` text COLLATE utf8mb4_unicode_ci,
  `not_before` timestamp NULL DEFAULT NULL,
  `not_after` timestamp NULL DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `project_auth_jwt_keys_kid_unique` (`kid`),
  KEY `project_auth_jwt_keys_project_id_is_active_index` (`project_id`,`is_active`),
  CONSTRAINT `project_auth_jwt_keys_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table project_auth_refresh_tokens
# ------------------------------------------------------------

DROP TABLE IF EXISTS `project_auth_refresh_tokens`;

CREATE TABLE `project_auth_refresh_tokens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `project_id` bigint unsigned NOT NULL,
  `project_auth_user_id` bigint unsigned NOT NULL,
  `project_auth_session_id` bigint unsigned NOT NULL,
  `family_uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token_hash` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `replaced_by_token_id` bigint unsigned DEFAULT NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NOT NULL,
  `revoked_at` timestamp NULL DEFAULT NULL,
  `reused_at` timestamp NULL DEFAULT NULL,
  `issued_ip` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `issued_user_agent` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `project_auth_refresh_tokens_token_hash_unique` (`token_hash`),
  KEY `project_auth_refresh_tokens_replaced_by_token_id_foreign` (`replaced_by_token_id`),
  KEY `part_project_family_idx` (`project_id`,`family_uuid`),
  KEY `part_user_expires_idx` (`project_auth_user_id`,`expires_at`),
  KEY `part_session_expires_idx` (`project_auth_session_id`,`expires_at`),
  CONSTRAINT `project_auth_refresh_tokens_project_auth_session_id_foreign` FOREIGN KEY (`project_auth_session_id`) REFERENCES `project_auth_sessions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `project_auth_refresh_tokens_project_auth_user_id_foreign` FOREIGN KEY (`project_auth_user_id`) REFERENCES `project_auth_users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `project_auth_refresh_tokens_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `project_auth_refresh_tokens_replaced_by_token_id_foreign` FOREIGN KEY (`replaced_by_token_id`) REFERENCES `project_auth_refresh_tokens` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table project_auth_sessions
# ------------------------------------------------------------

DROP TABLE IF EXISTS `project_auth_sessions`;

CREATE TABLE `project_auth_sessions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `project_id` bigint unsigned NOT NULL,
  `project_auth_user_id` bigint unsigned NOT NULL,
  `session_uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `last_activity_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NOT NULL,
  `revoked_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `project_auth_sessions_session_uuid_unique` (`session_uuid`),
  KEY `project_auth_sessions_project_auth_user_id_foreign` (`project_auth_user_id`),
  KEY `project_auth_sessions_project_id_project_auth_user_id_index` (`project_id`,`project_auth_user_id`),
  KEY `project_auth_sessions_project_id_expires_at_index` (`project_id`,`expires_at`),
  CONSTRAINT `project_auth_sessions_project_auth_user_id_foreign` FOREIGN KEY (`project_auth_user_id`) REFERENCES `project_auth_users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `project_auth_sessions_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table project_auth_users
# ------------------------------------------------------------

DROP TABLE IF EXISTS `project_auth_users`;

CREATE TABLE `project_auth_users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `project_id` bigint unsigned NOT NULL,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `display_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `last_login_at` timestamp NULL DEFAULT NULL,
  `suspended_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `project_auth_users_project_id_email_unique` (`project_id`,`email`),
  UNIQUE KEY `project_auth_users_uuid_unique` (`uuid`),
  KEY `project_auth_users_project_id_last_login_at_index` (`project_id`,`last_login_at`),
  KEY `project_auth_users_project_id_suspended_at_index` (`project_id`,`suspended_at`),
  CONSTRAINT `project_auth_users_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table project_templates
# ------------------------------------------------------------

DROP TABLE IF EXISTS `project_templates`;

CREATE TABLE `project_templates` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `has_demo_data` tinyint(1) NOT NULL DEFAULT '0',
  `data` json NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `project_templates_uuid_unique` (`uuid`),
  UNIQUE KEY `project_templates_slug_unique` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table project_user
# ------------------------------------------------------------

DROP TABLE IF EXISTS `project_user`;

CREATE TABLE `project_user` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `project_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `project_user_project_id_user_id_unique` (`project_id`,`user_id`),
  KEY `project_user_user_id_foreign` (`user_id`),
  CONSTRAINT `project_user_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `project_user_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table projects
# ------------------------------------------------------------

DROP TABLE IF EXISTS `projects`;

CREATE TABLE `projects` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `preview_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `default_locale` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'en',
  `locales` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `disk` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'public',
  `public_api` tinyint(1) DEFAULT '0',
  `project_auth_require_verified_email` tinyint(1) NOT NULL DEFAULT '0',
  `project_auth_email_verification_config` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `projects_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table role_has_permissions
# ------------------------------------------------------------

DROP TABLE IF EXISTS `role_has_permissions`;

CREATE TABLE `role_has_permissions` (
  `permission_id` bigint unsigned NOT NULL,
  `role_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`permission_id`,`role_id`),
  KEY `role_has_permissions_role_id_foreign` (`role_id`),
  CONSTRAINT `role_has_permissions_permission_id_foreign` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `role_has_permissions_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

LOCK TABLES `role_has_permissions` WRITE;
/*!40000 ALTER TABLE `role_has_permissions` DISABLE KEYS */;

INSERT INTO `role_has_permissions` (`permission_id`, `role_id`)
VALUES
	(1,1),
	(2,1),
	(3,1),
	(4,1),
	(5,1),
	(6,1),
	(7,1),
	(8,1),
	(9,1),
	(10,1),
	(11,1),
	(12,1),
	(13,1),
	(14,1),
	(15,1),
	(16,1),
	(17,1),
	(18,1),
	(19,1),
	(20,1),
	(21,1),
	(22,1),
	(23,1),
	(24,1),
	(25,1),
	(26,1),
	(27,1),
	(28,1),
	(29,1),
	(30,1),
	(31,1),
	(32,1),
	(33,1),
	(34,1),
	(35,1),
	(36,1),
	(37,1),
	(38,1),
	(1,2),
	(16,2),
	(17,2),
	(18,2),
	(19,2),
	(20,2),
	(21,2),
	(22,2),
	(23,2),
	(24,2),
	(25,2),
	(26,2),
	(27,2),
	(28,2),
	(29,2),
	(30,2),
	(31,2),
	(32,2),
	(33,2),
	(34,2),
	(35,2),
	(36,2),
	(37,2),
	(38,2),
	(29,3),
	(30,3),
	(31,3),
	(32,3),
	(33,3),
	(35,3),
	(36,3),
	(37,3);

/*!40000 ALTER TABLE `role_has_permissions` ENABLE KEYS */;
UNLOCK TABLES;


# Dump of table roles
# ------------------------------------------------------------

DROP TABLE IF EXISTS `roles`;

CREATE TABLE `roles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `guard_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `roles_name_guard_name_unique` (`name`,`guard_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;

INSERT INTO `roles` (`id`, `name`, `guard_name`, `created_at`, `updated_at`)
VALUES
	(1,'Super Admin','web','2026-08-08 06:50:53','2026-08-08 06:50:53'),
	(2,'Project Admin','web','2026-08-08 06:50:53','2026-08-08 06:50:53'),
	(3,'Content Editor','web','2026-08-08 06:50:53','2026-08-08 06:50:53');

/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;


# Dump of table sessions
# ------------------------------------------------------------

DROP TABLE IF EXISTS `sessions`;

CREATE TABLE `sessions` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_activity` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

LOCK TABLES `sessions` WRITE;
/*!40000 ALTER TABLE `sessions` DISABLE KEYS */;

INSERT INTO `sessions` (`id`, `user_id`, `ip_address`, `user_agent`, `payload`, `last_activity`)
VALUES
	('RjnjnzL5QOh50GkpsOGzXjn5SuAK7n6OXExsC9W2',NULL,'127.0.0.1','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36','YTo0OntzOjY6Il90b2tlbiI7czo0MDoibXpLZElQYVA2ZWh5bUVHNnR4emVzSFMxMHNlTHlSaFFIeFNjd05ociI7czozOiJ1cmwiO2E6MTp7czo4OiJpbnRlbmRlZCI7czoyMjoiaHR0cHM6Ly9lbG1hcGljbXMudGVzdCI7fXM6OToiX3ByZXZpb3VzIjthOjI6e3M6MzoidXJsIjtzOjI4OiJodHRwczovL2VsbWFwaWNtcy50ZXN0L2xvZ2luIjtzOjU6InJvdXRlIjtzOjU6ImxvZ2luIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==',1786171854);

/*!40000 ALTER TABLE `sessions` ENABLE KEYS */;
UNLOCK TABLES;


# Dump of table users
# ------------------------------------------------------------

DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `remember_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;

INSERT INTO `users` (`id`, `name`, `email`, `email_verified_at`, `password`, `remember_token`, `created_at`, `updated_at`)
VALUES
	(1,'Admin','admin@admin.com','2026-08-08 06:50:52','$2y$12$5gi4Kg/yFd8yg2cw8I1O4uFIkNr0WvsWaqFGmZYZiM3Zh26wL7/xi','aj5W28aVTG','2026-08-08 06:50:52','2026-08-08 06:50:52');

/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;


# Dump of table webhook_collections
# ------------------------------------------------------------

DROP TABLE IF EXISTS `webhook_collections`;

CREATE TABLE `webhook_collections` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `webhook_id` bigint unsigned NOT NULL,
  `collection_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `webhook_collections_webhook_id_foreign` (`webhook_id`),
  KEY `webhook_collections_collection_id_foreign` (`collection_id`),
  CONSTRAINT `webhook_collections_collection_id_foreign` FOREIGN KEY (`collection_id`) REFERENCES `collections` (`id`) ON DELETE CASCADE,
  CONSTRAINT `webhook_collections_webhook_id_foreign` FOREIGN KEY (`webhook_id`) REFERENCES `webhooks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table webhook_logs
# ------------------------------------------------------------

DROP TABLE IF EXISTS `webhook_logs`;

CREATE TABLE `webhook_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `project_uuid` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `webhook_id` bigint unsigned NOT NULL,
  `action` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `request` json DEFAULT NULL,
  `response` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `webhook_logs_webhook_id_foreign` (`webhook_id`),
  CONSTRAINT `webhook_logs_webhook_id_foreign` FOREIGN KEY (`webhook_id`) REFERENCES `webhooks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



# Dump of table webhooks
# ------------------------------------------------------------

DROP TABLE IF EXISTS `webhooks`;

CREATE TABLE `webhooks` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `project_id` bigint unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `url` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `secret` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `events` json NOT NULL,
  `sources` json NOT NULL,
  `payload` tinyint(1) NOT NULL DEFAULT '1',
  `status` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `webhooks_uuid_unique` (`uuid`),
  KEY `webhooks_project_id_foreign` (`project_id`),
  KEY `webhooks_created_by_foreign` (`created_by`),
  CONSTRAINT `webhooks_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `webhooks_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;




/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
