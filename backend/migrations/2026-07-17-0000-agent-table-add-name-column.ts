import { Knex } from "knex";

/**
 * The original agent-table migration was edited in place to add a `name`
 * column instead of being followed by a new migration. Any database that
 * already ran that migration before the edit will never get the column,
 * since Knex tracks applied migrations by filename, not content. This
 * migration backfills the column for those databases.
 */
export async function up(knex: Knex): Promise<void> {
    const hasColumn = await knex.schema.hasColumn("agent", "name");
    if (!hasColumn) {
        await knex.schema.alterTable("agent", (table) => {
            table.string("name", 255);
        });
    }
}

export async function down(knex: Knex): Promise<void> {
    const hasColumn = await knex.schema.hasColumn("agent", "name");
    if (hasColumn) {
        await knex.schema.alterTable("agent", (table) => {
            table.dropColumn("name");
        });
    }
}
