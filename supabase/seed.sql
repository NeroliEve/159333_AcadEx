-- =============================================================================
-- AcadEx seed data
-- Run this in the Supabase SQL editor on a fresh database.
--
-- Order matters:
--   1. study_areas
--   2. universities
--   3. courses
--   4. listings (requires a real seller_id — see instructions below)
--
-- For the listings block, first run:
--   select id, email from auth.users;
-- Then replace '<your-user-uuid>' in the DO block with your UUID.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Study areas (admin-managed reference data)
-- -----------------------------------------------------------------------------

insert into public.study_areas (name, slug) values
  ('Business & Commerce',       'business-commerce'),
  ('Science & Mathematics',     'science-mathematics'),
  ('Information Technology',    'information-technology'),
  ('Arts & Humanities',         'arts-humanities'),
  ('Law',                       'law'),
  ('Health & Medicine',         'health-medicine'),
  ('Engineering',               'engineering'),
  ('Education',                 'education'),
  ('Social Sciences',           'social-sciences'),
  ('Architecture & Design',     'architecture-design'),
  ('Agriculture & Environment', 'agriculture-environment'),
  ('Music & Performing Arts',   'music-performing-arts');

-- -----------------------------------------------------------------------------
-- Universities (all 8 NZ universities)
-- -----------------------------------------------------------------------------

insert into public.universities (name, slug, is_active) values
  ('University of Auckland',              'university-of-auckland',         true),
  ('Auckland University of Technology',   'auckland-university-of-technology', true),
  ('University of Waikato',               'university-of-waikato',          true),
  ('Massey University',                   'massey-university',              true),
  ('Victoria University of Wellington',   'victoria-university-of-wellington', true),
  ('University of Canterbury',            'university-of-canterbury',       true),
  ('Lincoln University',                  'lincoln-university',             true),
  ('University of Otago',                 'university-of-otago',            true)
;

-- -----------------------------------------------------------------------------
-- Courses
-- Using course codes common to NZ universities. university_id references above.
-- -----------------------------------------------------------------------------

insert into public.courses (course_code, course_name, university, university_id) values

  -- University of Auckland (id 1)
  ('BIOSCI101', 'Cell Biology and Genetics',         'University of Auckland',            (select id from universities where slug = 'university-of-auckland')),
  ('COMPSCI101','Principles of Programming',         'University of Auckland',            (select id from universities where slug = 'university-of-auckland')),
  ('ECON101',   'Microeconomics',                    'University of Auckland',            (select id from universities where slug = 'university-of-auckland')),
  ('ECON102',   'Macroeconomics',                    'University of Auckland',            (select id from universities where slug = 'university-of-auckland')),
  ('ACCTG101',  'Financial Accounting',              'University of Auckland',            (select id from universities where slug = 'university-of-auckland')),
  ('LAWGEN101', 'Legal System and Method',           'University of Auckland',            (select id from universities where slug = 'university-of-auckland')),
  ('PSYCH101',  'Introduction to Psychology',        'University of Auckland',            (select id from universities where slug = 'university-of-auckland')),
  ('STATS101',  'Statistics',                        'University of Auckland',            (select id from universities where slug = 'university-of-auckland')),
  ('MKTG101',   'Marketing Principles',              'University of Auckland',            (select id from universities where slug = 'university-of-auckland')),
  ('ENGGEN121', 'Engineering Mechanics',             'University of Auckland',            (select id from universities where slug = 'university-of-auckland')),
  ('MEDSCI142', 'Biology of Cells and Organisms',   'University of Auckland',            (select id from universities where slug = 'university-of-auckland')),
  ('PHIL101',   'Introduction to Philosophy',        'University of Auckland',            (select id from universities where slug = 'university-of-auckland')),

  -- AUT (id 2)
  ('BUS500',    'Business Fundamentals',             'Auckland University of Technology', (select id from universities where slug = 'auckland-university-of-technology')),
  ('COMP500',   'Introduction to Computing',         'Auckland University of Technology', (select id from universities where slug = 'auckland-university-of-technology')),
  ('NURS501',   'Foundations of Nursing Practice',  'Auckland University of Technology', (select id from universities where slug = 'auckland-university-of-technology')),
  ('LAWS501',   'Contract and Tort Law',             'Auckland University of Technology', (select id from universities where slug = 'auckland-university-of-technology')),

  -- University of Waikato (id 3)
  ('MNGT101',   'Introduction to Management',        'University of Waikato',             (select id from universities where slug = 'university-of-waikato')),
  ('ECON100',   'Economic Principles',               'University of Waikato',             (select id from universities where slug = 'university-of-waikato')),
  ('CSMAX101',  'Computing and Society',             'University of Waikato',             (select id from universities where slug = 'university-of-waikato')),

  -- Massey University (id 4)
  ('124100',    'Accounting Information',            'Massey University',                 (select id from universities where slug = 'massey-university')),
  ('159101',    'Introduction to Psychology',        'Massey University',                 (select id from universities where slug = 'massey-university')),
  ('228101',    'Foundations of Finance',            'Massey University',                 (select id from universities where slug = 'massey-university')),

  -- Victoria University of Wellington (id 5)
  ('ACCY111',   'Accounting and Financial Reporting','Victoria University of Wellington',  (select id from universities where slug = 'victoria-university-of-wellington')),
  ('LAWS111',   'Law and Society',                   'Victoria University of Wellington',  (select id from universities where slug = 'victoria-university-of-wellington')),
  ('COMP102',   'Introduction to Computer Science',  'Victoria University of Wellington',  (select id from universities where slug = 'victoria-university-of-wellington')),
  ('PSYC221',   'Cognitive Psychology',              'Victoria University of Wellington',  (select id from universities where slug = 'victoria-university-of-wellington')),

  -- University of Canterbury (id 6)
  ('ACCT101',   'Financial Accounting',              'University of Canterbury',           (select id from universities where slug = 'university-of-canterbury')),
  ('COSC121',   'Introduction to Computer Science',  'University of Canterbury',           (select id from universities where slug = 'university-of-canterbury')),
  ('ECON104',   'Principles of Economics',           'University of Canterbury',           (select id from universities where slug = 'university-of-canterbury')),
  ('ENGL101',   'Writing and Critical Thinking',     'University of Canterbury',           (select id from universities where slug = 'university-of-canterbury')),

  -- Lincoln University (id 7)
  ('AGRI101',   'Introduction to Agriculture',       'Lincoln University',                 (select id from universities where slug = 'lincoln-university')),
  ('BSNS101',   'Business Management',               'Lincoln University',                 (select id from universities where slug = 'lincoln-university')),
  ('ENVS101',   'Introduction to Environmental Science', 'Lincoln University',             (select id from universities where slug = 'lincoln-university')),

  -- University of Otago (id 8)
  ('BIOL111',   'Cell and Molecular Biology',        'University of Otago',               (select id from universities where slug = 'university-of-otago')),
  ('CHEM111',   'General Chemistry',                 'University of Otago',               (select id from universities where slug = 'university-of-otago')),
  ('ACCT110',   'Accounting for Business',           'University of Otago',               (select id from universities where slug = 'university-of-otago')),
  ('LAWS101',   'Legal Foundations',                 'University of Otago',               (select id from universities where slug = 'university-of-otago')),
  ('PSYC111',   'Foundations of Psychology',         'University of Otago',               (select id from universities where slug = 'university-of-otago'))

;

-- -----------------------------------------------------------------------------
-- Sample listings
-- Automatically uses the first admin account in profiles as the seller.
-- Make sure you have signed up and set your account to admin before running this.
-- -----------------------------------------------------------------------------

do $$
declare
  -- picks the first admin user so no UUID needs to be hardcoded
  v_user    uuid := (select id from public.profiles where role = 'admin' limit 1);
  v_biosci  int := (select id from public.courses where course_code = 'BIOSCI101');
  v_compsci int := (select id from public.courses where course_code = 'COMPSCI101');
  v_econ101 int := (select id from public.courses where course_code = 'ECON101');
  v_acctg   int := (select id from public.courses where course_code = 'ACCTG101');
  v_psych   int := (select id from public.courses where course_code = 'PSYCH101');
  v_stats   int := (select id from public.courses where course_code = 'STATS101');
  v_law     int := (select id from public.courses where course_code = 'LAWGEN101');
  v_mktg    int := (select id from public.courses where course_code = 'MKTG101');
  v_chem    int := (select id from public.courses where course_code = 'CHEM111');
  v_biol    int := (select id from public.courses where course_code = 'BIOL111');
  v_sa_science  int := (select id from public.study_areas where slug = 'science-mathematics');
  v_sa_it       int := (select id from public.study_areas where slug = 'information-technology');
  v_sa_business int := (select id from public.study_areas where slug = 'business-commerce');
  v_sa_social   int := (select id from public.study_areas where slug = 'social-sciences');
  v_sa_law      int := (select id from public.study_areas where slug = 'law');
begin
  if v_user is null then
    raise exception 'No admin user found in profiles. Sign up and set your role to admin first.';
  end if;

  insert into public.listings
    (seller_id, title, author, edition, isbn, publisher, description, price, condition, listing_type, course_id, study_area_id, status)
  values
    (v_user, 'Campbell Biology', 'Jane B. Reece, Lisa A. Urry', '12th Edition', '978-0135188743', 'Pearson', 'Good condition, some highlighting in chapters 1–4. All pages intact.', 65, 'good', 'sale_only', v_biosci, v_sa_science, 'available'),
    (v_user, 'Introduction to Algorithms', 'Thomas H. Cormen', '3rd Edition', '978-0262033848', 'MIT Press', 'Like new — barely used. No writing. Perfect for COMPSCI.', 80, 'like_new', 'sale_only', v_compsci, v_sa_it, 'available'),
    (v_user, 'Principles of Economics', 'N. Gregory Mankiw', '8th Edition', '978-1305585126', 'Cengage Learning', 'A few sticky notes but no pen marks. Good study resource.', 55, 'good', 'sale_or_trade', v_econ101, v_sa_business, 'available'),
    (v_user, 'Financial Accounting', 'Walter T. Harrison Jr.', '10th Edition', '978-0133427536', 'Pearson', 'Heavily annotated but all text still readable. Selling cheap.', 30, 'fair', 'sale_only', v_acctg, v_sa_business, 'available'),
    (v_user, 'Psychology: Themes and Variations', 'Wayne Weiten', '10th Edition', '978-1305498204', 'Cengage', 'Mint condition — bought the wrong edition. Selling at cost.', 75, 'like_new', 'sale_only', v_psych, v_sa_social, 'available'),
    (v_user, 'The Practice of Statistics', 'Daren S. Starnes', '5th Edition', '978-1464108730', 'W.H. Freeman', 'Some pencil marks that rub out easily. Answers booklet included.', 40, 'good', 'sale_only', v_stats, v_sa_science, 'available'),
    (v_user, 'Contract Law in New Zealand', 'Stephen Todd', '2nd Edition', '978-1927292334', 'LexisNexis NZ', 'Used for one semester. Minor cover scuff, otherwise excellent.', 90, 'good', 'sale_only', v_law, v_sa_law, 'available'),
    (v_user, 'Marketing: An Introduction', 'Gary Armstrong, Philip Kotler', '14th Edition', '978-0134492513', 'Pearson', 'No markings at all. Bought new, only used for one course.', 60, 'new', 'sale_only', v_mktg, v_sa_business, 'available'),
    (v_user, 'Organic Chemistry', 'Paula Y. Bruice', '8th Edition', '978-0134042282', 'Pearson', 'Would swap for Physical Chemistry or sell. Good condition.', 70, 'good', 'sale_or_trade', v_chem, v_sa_science, 'available'),
    (v_user, 'Molecular Biology of the Cell', 'Bruce Alberts', '6th Edition', '978-0815344322', 'W.W. Norton', 'Well used but all diagrams legible. Great reference to keep.', 45, 'fair', 'sale_only', v_biol, v_sa_science, 'available'),
    (v_user, 'Clean Code', 'Robert C. Martin', '1st Edition', '978-0132350884', 'Prentice Hall', 'Excellent condition. A must-read for any software engineering course.', 50, 'like_new', 'sale_only', v_compsci, v_sa_it, 'available'),
    (v_user, 'Principles of Microeconomics', 'N. Gregory Mankiw', '7th Edition', '978-1285165905', 'Cengage', 'Already sold my macro book — now selling micro. Lightly used.', 45, 'good', 'sale_only', v_econ101, v_sa_business, 'pending');

end $$;
