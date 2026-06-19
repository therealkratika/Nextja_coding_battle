const mongoose = require('mongoose');
const dotenv = require('dotenv')
dotenv.config();
const connectDB = async()=>{
    try{
         const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MondoDB connected`);
    }catch(error){
        console.log(`${error.message}`);
        process.exit(1);
    }
};
module.exports  = connectDB;
