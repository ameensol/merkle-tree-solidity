CREATE OR REPLACE FUNCTION pairHash(bytea, bytea) returns text AS $$
  SELECT CASE
    WHEN ($1 <= $2) THEN encode(digest($1 || $2, 'sha256'), 'hex')
    ELSE encode(digest($2 || $1, 'sha256'), 'hex')
  END;
$$ LANGUAGE SQL STRICT IMMUTABLE;

CREATE OR REPLACE FUNCTION getMerkleRoot(bytea[]) returns text AS $$
  SELECT sha256($1);
$$ LANGUAGE SQL STRICT IMMUTABLE;


CREATE OR REPLACE FUNCTION checkMerkleProof(bytea) returns text AS $$
  SELECT encode(digest($1, 'sha256'), 'hex')
$$ LANGUAGE SQL STRICT IMMUTABLE;

CREATE OR REPLACE FUNCTION getMerkleProof(bytea) returns text AS $$
  SELECT encode(digest($1, 'sha256'), 'hex')
$$ LANGUAGE SQL STRICT IMMUTABLE;


CREATE OR REPLACE FUNCTION getMerkleRoot(bytea[]) RETURNS text AS $$
BEGIN
    FOR r IN
        SELECT * FROM foo WHERE fooid > 0
    LOOP
        -- can do some processing here
        RETURN NEXT r; -- return current row of SELECT
    END LOOP;
    RETURN;
END
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION getLayers(bytea[]) RETURNS bytea[][] AS $$
DECLARE
  layers bytea[][] = ;



CREATE OR REPLACE FUNCTION summer(integer[]) RETURNS integer AS $$
DECLARE
  result integer = 0;
  num integer;
BEGIN
  FOREACH num IN ARRAY $1 LOOP
    result := result + num;
  END LOOP;
  RETURN result;
END
$$ LANGUAGE plpgsql;

CREATE FUNCTION sales_tax(subtotal real) RETURNS real AS $$
BEGIN
    RETURN subtotal * 0.06;
END;
$$ LANGUAGE plpgsql;
