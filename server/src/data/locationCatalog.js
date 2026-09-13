// Master location catalog for the live-jobs "Location" picker — major
// global business/tech hubs organized by region, plus country-level entries
// and "Remote". Not exhaustive of every city on Earth, but broad enough to
// cover where most job searches on this app will actually target. Users can
// still type a custom location if theirs isn't listed.

const LOCATION_CATALOG = {
  remote: ['Remote', 'Remote (India)', 'Remote (US)', 'Remote (Worldwide)', 'Hybrid'],

  india: [
    'India', 'Bangalore, India', 'Hyderabad, India', 'Mumbai, India', 'Delhi, India',
    'Gurugram, India', 'Noida, India', 'Pune, India', 'Chennai, India', 'Kolkata, India',
    'Ahmedabad, India', 'Jaipur, India', 'Kochi, India', 'Chandigarh, India',
    'Indore, India', 'Coimbatore, India', 'Bhubaneswar, India', 'Nagpur, India',
    'Lucknow, India', 'Surat, India', 'Vadodara, India', 'Thiruvananthapuram, India',
  ],

  north_america: [
    'United States', 'New York, NY', 'San Francisco, CA', 'San Jose, CA',
    'Los Angeles, CA', 'Seattle, WA', 'Austin, TX', 'Chicago, IL', 'Boston, MA',
    'Washington, DC', 'Atlanta, GA', 'Denver, CO', 'Dallas, TX', 'Houston, TX',
    'Miami, FL', 'Phoenix, AZ', 'San Diego, CA', 'Portland, OR', 'Raleigh, NC',
    'Minneapolis, MN', 'Philadelphia, PA', 'Detroit, MI',
    'Canada', 'Toronto, Canada', 'Vancouver, Canada', 'Montreal, Canada',
    'Ottawa, Canada', 'Calgary, Canada',
    'Mexico', 'Mexico City, Mexico',
  ],

  europe: [
    'United Kingdom', 'London, UK', 'Manchester, UK', 'Edinburgh, UK', 'Birmingham, UK',
    'Germany', 'Berlin, Germany', 'Munich, Germany', 'Frankfurt, Germany',
    'Hamburg, Germany',
    'France', 'Paris, France', 'Lyon, France',
    'Netherlands', 'Amsterdam, Netherlands', 'Rotterdam, Netherlands',
    'Ireland', 'Dublin, Ireland',
    'Switzerland', 'Zurich, Switzerland', 'Geneva, Switzerland',
    'Spain', 'Madrid, Spain', 'Barcelona, Spain',
    'Italy', 'Milan, Italy', 'Rome, Italy',
    'Sweden', 'Stockholm, Sweden',
    'Poland', 'Warsaw, Poland', 'Krakow, Poland',
    'Portugal', 'Lisbon, Portugal',
    'Belgium', 'Brussels, Belgium',
    'Austria', 'Vienna, Austria',
    'Denmark', 'Copenhagen, Denmark',
    'Finland', 'Helsinki, Finland',
    'Norway', 'Oslo, Norway',
    'Romania', 'Bucharest, Romania',
    'Estonia', 'Tallinn, Estonia',
  ],

  middle_east: [
    'United Arab Emirates', 'Dubai, UAE', 'Abu Dhabi, UAE',
    'Saudi Arabia', 'Riyadh, Saudi Arabia', 'Jeddah, Saudi Arabia',
    'Qatar', 'Doha, Qatar',
    'Israel', 'Tel Aviv, Israel',
    'Kuwait', 'Kuwait City, Kuwait',
    'Bahrain', 'Manama, Bahrain',
    'Egypt', 'Cairo, Egypt',
    'Turkey', 'Istanbul, Turkey',
  ],

  asia_pacific: [
    'Singapore', 'Hong Kong', 'Japan', 'Tokyo, Japan', 'Osaka, Japan',
    'South Korea', 'Seoul, South Korea',
    'China', 'Shanghai, China', 'Beijing, China', 'Shenzhen, China',
    'Taiwan', 'Taipei, Taiwan',
    'Malaysia', 'Kuala Lumpur, Malaysia',
    'Indonesia', 'Jakarta, Indonesia',
    'Thailand', 'Bangkok, Thailand',
    'Vietnam', 'Ho Chi Minh City, Vietnam', 'Hanoi, Vietnam',
    'Philippines', 'Manila, Philippines',
    'Australia', 'Sydney, Australia', 'Melbourne, Australia', 'Brisbane, Australia',
    'New Zealand', 'Auckland, New Zealand',
    'Bangladesh', 'Dhaka, Bangladesh',
    'Pakistan', 'Karachi, Pakistan', 'Lahore, Pakistan',
    'Sri Lanka', 'Colombo, Sri Lanka',
    'Nepal', 'Kathmandu, Nepal',
  ],

  africa_south_america: [
    'South Africa', 'Johannesburg, South Africa', 'Cape Town, South Africa',
    'Nigeria', 'Lagos, Nigeria',
    'Kenya', 'Nairobi, Kenya',
    'Brazil', 'Sao Paulo, Brazil', 'Rio de Janeiro, Brazil',
    'Argentina', 'Buenos Aires, Argentina',
    'Colombia', 'Bogota, Colombia',
    'Chile', 'Santiago, Chile',
  ],
};

module.exports = { LOCATION_CATALOG };
