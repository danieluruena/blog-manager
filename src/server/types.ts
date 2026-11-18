import type { Session, User } from "./db/schema"

export type AppEnv = {
  Bindings: Env
  Variables: {
    requestId: string
    user: User
    session: Session
  }
}
