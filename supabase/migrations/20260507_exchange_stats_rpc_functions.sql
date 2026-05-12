-- Exchange statistics RPC functions for the admin statistics dashboard.
-- These functions aggregate completed transaction data dynamically —
-- charts update automatically as new exchanges are completed.

-- ─── 1. Summary stats ────────────────────────────────────────────────────────
-- Returns headline figures: total exchanges, average per month, this month vs
-- last month counts, growth percentage, and average agreed sale price.

CREATE OR REPLACE FUNCTION exchange_summary_stats()
RETURNS TABLE (
  total_exchanges     BIGINT,
  avg_per_month       NUMERIC,
  this_month_count    BIGINT,
  last_month_count    BIGINT,
  growth_percentage   NUMERIC,
  avg_agreed_price    NUMERIC
)
LANGUAGE sql SECURITY DEFINER AS $$
  WITH monthly_counts AS (
    SELECT
      DATE_TRUNC('month', completed_at) AS month,
      COUNT(*)                          AS count
    FROM transactions
    WHERE status = 'completed'
      AND completed_at IS NOT NULL
    GROUP BY DATE_TRUNC('month', completed_at)
  ),
  this_month AS (
    SELECT COUNT(*) AS count
    FROM transactions
    WHERE status = 'completed'
      AND completed_at >= DATE_TRUNC('month', NOW())
  ),
  last_month AS (
    SELECT COUNT(*) AS count
    FROM transactions
    WHERE status = 'completed'
      AND completed_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
      AND completed_at <  DATE_TRUNC('month', NOW())
  )
  SELECT
    (SELECT COUNT(*) FROM transactions WHERE status = 'completed')                    AS total_exchanges,
    ROUND(COALESCE(AVG(count), 0), 1)                                                 AS avg_per_month,
    (SELECT count FROM this_month)                                                    AS this_month_count,
    (SELECT count FROM last_month)                                                    AS last_month_count,
    CASE
      WHEN (SELECT count FROM last_month) = 0 THEN NULL
      ELSE ROUND(
        ((SELECT count FROM this_month)::NUMERIC - (SELECT count FROM last_month)::NUMERIC)
        / (SELECT count FROM last_month)::NUMERIC * 100, 1
      )
    END                                                                               AS growth_percentage,
    ROUND(COALESCE(
      (SELECT AVG(agreed_price) FROM transactions
       WHERE status = 'completed' AND agreed_price IS NOT NULL), 0
    ), 2)                                                                             AS avg_agreed_price
  FROM monthly_counts;
$$;


-- ─── 2. Monthly trend ────────────────────────────────────────────────────────
-- Returns exchange counts grouped by month and year, ordered chronologically.
-- Used for the area/line chart showing exchange volume over time.

CREATE OR REPLACE FUNCTION exchanges_by_month()
RETURNS TABLE (
  month          TEXT,
  year           INT,
  exchange_count BIGINT
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    TO_CHAR(DATE_TRUNC('month', completed_at), 'Mon') AS month,
    EXTRACT(YEAR FROM completed_at)::INT               AS year,
    COUNT(*)                                           AS exchange_count
  FROM transactions
  WHERE status = 'completed'
    AND completed_at IS NOT NULL
  GROUP BY DATE_TRUNC('month', completed_at), EXTRACT(YEAR FROM completed_at)
  ORDER BY DATE_TRUNC('month', completed_at);
$$;


-- ─── 3. By study area ────────────────────────────────────────────────────────
-- Returns exchange counts grouped by study area.
-- Listings without a study area are grouped as 'Uncategorised'.
-- Used for the horizontal bar chart.

CREATE OR REPLACE FUNCTION exchanges_by_study_area()
RETURNS TABLE (
  study_area     TEXT,
  exchange_count BIGINT
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    COALESCE(sa.name, 'Uncategorised') AS study_area,
    COUNT(*)                           AS exchange_count
  FROM transactions t
  JOIN listings l ON t.listing_id = l.id
  LEFT JOIN study_areas sa ON l.study_area_id = sa.id
  WHERE t.status = 'completed'
  GROUP BY sa.name
  ORDER BY exchange_count DESC;
$$;


-- ─── 4. Sale vs trade split ──────────────────────────────────────────────────
-- Returns exchange counts grouped by listing type (sale_only, trade_only,
-- sale_or_trade). Used for the pie chart.

CREATE OR REPLACE FUNCTION exchanges_by_listing_type()
RETURNS TABLE (
  listing_type   TEXT,
  exchange_count BIGINT
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    l.listing_type::TEXT AS listing_type,
    COUNT(*)             AS exchange_count
  FROM transactions t
  JOIN listings l ON t.listing_id = l.id
  WHERE t.status = 'completed'
  GROUP BY l.listing_type;
$$;


-- ─── 5. Top exchanged books ──────────────────────────────────────────────────
-- Returns the 10 most frequently exchanged book titles with their authors.
-- Used for the ranked list in the dashboard.

CREATE OR REPLACE FUNCTION top_exchanged_books()
RETURNS TABLE (
  title          TEXT,
  author         TEXT,
  exchange_count BIGINT
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    l.title,
    COALESCE(l.author, 'Unknown') AS author,
    COUNT(*)                      AS exchange_count
  FROM transactions t
  JOIN listings l ON t.listing_id = l.id
  WHERE t.status = 'completed'
  GROUP BY l.title, l.author
  ORDER BY exchange_count DESC
  LIMIT 10;
$$;


-- ─── 6. By year level ────────────────────────────────────────────────────────
-- Infers year level from the first digit of the associated course code
-- (e.g. COMP102 → year 1, COMP201 → year 2).
-- Listings without a course are grouped as 'Unknown'.
-- Used for the year level bar chart.

CREATE OR REPLACE FUNCTION exchanges_by_year_level()
RETURNS TABLE (
  year_level     TEXT,
  exchange_count BIGINT
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    COALESCE(SUBSTRING(c.course_code FROM '[0-9]'), 'Unknown') AS year_level,
    COUNT(*) AS exchange_count
  FROM transactions t
  JOIN listings l ON t.listing_id = l.id
  LEFT JOIN courses c ON l.course_id = c.id
  WHERE t.status = 'completed'
  GROUP BY year_level
  ORDER BY year_level;
$$;
