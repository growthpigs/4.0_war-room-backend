import { SQLDatabase } from "encore.dev/storage/sqldb";

export const warRoomDB = new SQLDatabase("war_room", {
  migrations: "./migrations",
});
