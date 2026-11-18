export const userRoleValues = ["admin", "editor"] as const
export type UserRole = (typeof userRoleValues)[number]

export const articleStatusValues = ["draft", "published", "hidden", "featured"] as const
export type ArticleStatus = (typeof articleStatusValues)[number]
