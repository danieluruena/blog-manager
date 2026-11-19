import type { Context } from "hono"
import { deleteCookie, getCookie, setCookie } from "hono/cookie"

import type { AppEnv } from "../types"

export const SESSION_COOKIE = "bm_session"
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

function isSecureRequest(c: Context<AppEnv>): boolean {
  return new URL(c.req.url).protocol === "https:"
}

export function getSessionToken(c: Context<AppEnv>): string | null {
  return getCookie(c, SESSION_COOKIE) ?? null
}

export function setSessionCookie(c: Context<AppEnv>, token: string): void {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isSecureRequest(c),
    sameSite: "Strict",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
}

export function clearSessionCookie(c: Context<AppEnv>): void {
  deleteCookie(c, SESSION_COOKIE, {
    path: "/",
    secure: isSecureRequest(c),
    sameSite: "Strict",
  })
}
