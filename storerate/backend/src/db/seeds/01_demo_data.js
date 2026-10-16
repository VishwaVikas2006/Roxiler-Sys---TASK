import bcrypt from 'bcryptjs';

/**
 * Demo data for local development and manual testing.
 * Every name is >= 20 characters to satisfy the platform's validation rules.
 *
 * Demo credentials:
 *   admin  -> admin@storerate.com   / Admin@1234
 *   owners -> owner1..6@storerate.com / Owner@1234   (owner6 has no store yet)
 *   users  -> user1..6@storerate.com  / User@12345
 */

const PASSWORDS = {
  admin: 'Admin@1234',
  owner: 'Owner@1234',
  user: 'User@12345',
};

const OWNERS = [
  {
    name: 'Rajesh Kumar Venkateshwarlu',
    email: 'owner1@storerate.com',
    address: 'H.No 4-32, Vivekananda Nagar, Kukatpally, Hyderabad 500072',
  },
  {
    name: 'Anita Sharma Raghunathan',
    email: 'owner2@storerate.com',
    address: 'Flat 302, Lake View Residency, Hitech City, Hyderabad 500081',
  },
  {
    name: 'Mohammed Imran Siddiqui Khan',
    email: 'owner3@storerate.com',
    address: 'Plot 18, Road No 10, Jubilee Hills, Hyderabad 500033',
  },
  {
    name: 'Lakshmi Devi Chandrasekhar',
    email: 'owner4@storerate.com',
    address: '12-3-45 Ayyappa Society, Madhapur, Hyderabad 500081',
  },
  {
    name: 'Harish Chandra Prasad Gupta',
    email: 'owner5@storerate.com',
    address: 'Villa 7, Nallagandla Road, Gachibowli, Hyderabad 500032',
  },
  {
    name: 'Suresh Babu Nagarjuna Reddy',
    email: 'owner6@storerate.com',
    address: 'MIG 221, KPHB Colony Phase 3, Kukatpally, Hyderabad 500085',
  },
];

const USERS = [
  {
    name: 'Priya Lakshmi Narasimhan',
    email: 'user1@storerate.com',
    address: 'Flat 201, Sai Enclave, KPHB Phase 2, Kukatpally, Hyderabad 500072',
  },
  {
    name: 'Karthik Reddy Annapureddy',
    email: 'user2@storerate.com',
    address: 'H.No 7-1-28, Balaji Nagar, Kukatpally, Hyderabad 500072',
  },
  {
    name: 'Sneha Patel Krishnamurthy',
    email: 'user3@storerate.com',
    address: 'Plot 45, Whitefields, Kondapur, Hyderabad 500084',
  },
  {
    name: 'Arjun Varma Bhupathiraju',
    email: 'user4@storerate.com',
    address: 'Flat 1104, Aparna Cyberzon, Nallagandla, Hyderabad 500019',
  },
  {
    name: 'Divya Sree Ramachandran',
    email: 'user5@storerate.com',
    address: 'H.No 2-56, Moosapet Main Road, Kukatpally, Hyderabad 500018',
  },
  {
    name: 'Vikram Singh Chauhan Rathore',
    email: 'user6@storerate.com',
    address: 'Villa 23, My Home Avatar, Narsingi, Hyderabad 500089',
  },
];

// ownerIndex refers to OWNERS[] above; owner6 intentionally has no store.
const STORES = [
  {
    ownerIndex: 0,
    name: 'Kukatpally Fresh Mart Supermarket',
    email: 'hello@kukatpallyfreshmart.com',
    address: 'Plot 12, KPHB Phase 1 Main Road, Kukatpally, Hyderabad 500072',
  },
  {
    ownerIndex: 1,
    name: 'Hitech City Electronics Hub Store',
    email: 'support@hitechelectronicshub.com',
    address: 'Shop 5, Cyber Towers Road, Hitech City, Hyderabad 500081',
  },
  {
    ownerIndex: 2,
    name: 'Jubilee Hills Bookstore and Cafe',
    email: 'books@jubileehillscafe.com',
    address: 'Road No 36, Jubilee Hills, Hyderabad 500033',
  },
  {
    ownerIndex: 3,
    name: 'Madhapur Organic Grocery Corner',
    email: 'care@madhapurorganic.com',
    address: '12-3-45 Ayyappa Society Main Road, Madhapur, Hyderabad 500081',
  },
  {
    ownerIndex: 4,
    name: 'Gachibowli Sports and Fitness Store',
    email: 'team@gachibowlisports.com',
    address: 'Ground Floor, DLF Cyber City Road, Gachibowli, Hyderabad 500032',
  },
];

// [storeIndex, userIndex, rating] — store 5 (Gachibowli) deliberately has no ratings yet.
const RATINGS = [
  [0, 0, 5],
  [0, 1, 4],
  [0, 2, 4],
  [0, 3, 5],
  [0, 4, 3],
  [1, 0, 4],
  [1, 1, 3],
  [1, 2, 4],
  [1, 5, 5],
  [2, 1, 5],
  [2, 3, 4],
  [2, 4, 5],
  [3, 0, 3],
  [3, 2, 2],
  [3, 4, 4],
  [3, 5, 3],
];

export async function seed(knex) {
  await knex.raw('TRUNCATE TABLE ratings, stores, users RESTART IDENTITY CASCADE');

  const [adminHash, ownerHash, userHash] = await Promise.all([
    bcrypt.hash(PASSWORDS.admin, 10),
    bcrypt.hash(PASSWORDS.owner, 10),
    bcrypt.hash(PASSWORDS.user, 10),
  ]);

  await knex('users').insert({
    name: 'System Administrator Account',
    email: 'admin@storerate.com',
    password_hash: adminHash,
    address: 'StoreRate HQ, 3rd Floor, Cyber Gateway, Hitech City, Hyderabad 500081',
    role: 'admin',
  });

  const owners = await knex('users')
    .insert(OWNERS.map((o) => ({ ...o, password_hash: ownerHash, role: 'store_owner' })))
    .returning('id');

  const users = await knex('users')
    .insert(USERS.map((u) => ({ ...u, password_hash: userHash, role: 'user' })))
    .returning('id');

  const stores = await knex('stores')
    .insert(
      STORES.map(({ ownerIndex, ...store }) => ({
        ...store,
        owner_id: owners[ownerIndex].id,
      })),
    )
    .returning('id');

  // Spread timestamps over the last few weeks so "Submitted" columns look realistic.
  const now = Date.now();
  await knex('ratings').insert(
    RATINGS.map(([storeIndex, userIndex, rating], i) => {
      const submittedAt = new Date(now - (RATINGS.length - i) * 36 * 60 * 60 * 1000);
      return {
        store_id: stores[storeIndex].id,
        user_id: users[userIndex].id,
        rating,
        created_at: submittedAt,
        updated_at: submittedAt,
      };
    }),
  );
}
