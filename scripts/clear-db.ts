import { Client } from 'pg';

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL! });
  await client.connect();

  await client.query(`
    DO $$
    DECLARE
        r RECORD;
    BEGIN
        FOR r IN (
            SELECT tablename FROM pg_tables
            WHERE schemaname = 'public'
            AND tablename != '_prisma_migrations'
        ) LOOP
            EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;

        FOR r IN (
            SELECT tablename FROM pg_tables
            WHERE schemaname = 'pgboss'
            AND tablename NOT IN ('queue', 'version', 'schedule')
        ) LOOP
            EXECUTE 'TRUNCATE TABLE pgboss.' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
    END $$;
  `);

  console.log('✅ All tables cleared!');
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
