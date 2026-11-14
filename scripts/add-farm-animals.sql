-- Farm animals + groups tables (also created by TypeORM synchronize in non-prod).

CREATE TABLE IF NOT EXISTS farm_animal_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name varchar(255) NOT NULL,
  species varchar(32) NOT NULL,
  breed varchar(128),
  count integer NOT NULL DEFAULT 0,
  date_created date,
  production_type varchar(32),
  health_status varchar(32) NOT NULL DEFAULT 'Healthy',
  vaccination_status varchar(32) NOT NULL DEFAULT 'Not Vaccinated',
  unit_price numeric(14, 2) NOT NULL DEFAULT 0,
  currency varchar(8) NOT NULL DEFAULT 'USD',
  price_updated date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_farm_animal_groups_user_id
  ON farm_animal_groups (user_id);

CREATE TABLE IF NOT EXISTS farm_animals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tag varchar(64) NOT NULL,
  species varchar(32) NOT NULL,
  breed varchar(128),
  date_of_birth date,
  sex varchar(16),
  weight numeric(12, 2),
  status varchar(32) NOT NULL DEFAULT 'Healthy',
  vaccination_status varchar(32) NOT NULL DEFAULT 'Not Vaccinated',
  price numeric(14, 2) NOT NULL DEFAULT 0,
  currency varchar(8) NOT NULL DEFAULT 'USD',
  price_updated date,
  group_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_farm_animals_user_id ON farm_animals (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_farm_animals_user_tag
  ON farm_animals (user_id, tag);
CREATE INDEX IF NOT EXISTS idx_farm_animals_user_group
  ON farm_animals (user_id, group_id);
