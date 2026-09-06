import { MongoClient } from 'mongodb';

const DEFAULT_URI = 'mongodb+srv://21223203087:rifat7171@cluster0.ewtgwhu.mongodb.net/New-FDC?appName=Cluster0';
const uri = process.env.MONGODB_URI || DEFAULT_URI;

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

const globalWithMongo = global as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

if (!globalWithMongo._mongoClientPromise) {
  client = new MongoClient(uri);
  globalWithMongo._mongoClientPromise = client.connect();
}
clientPromise = globalWithMongo._mongoClientPromise;

export default clientPromise;
