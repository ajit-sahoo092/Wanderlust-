const express=require("express");
const router=express.Router();
const wrapAsync=require("../utiles/warpAsync.js");
const Listing=require("../models/listing.js");
const {isLoggedIn,isOwner,validateListing}=require("../middilware.js");
const { populate } = require("../models/user.js");
const mbxGeoCoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken=process.env.MAP_TOKEN;
const geocodingClient = mbxGeoCoding({ accessToken: mapToken });

module.exports.index=async (req,res)=>{
 const allListings =await Listing.find({});
 res.render("./listings/index.ejs",{allListings});
}

module.exports.renderNewForm=(req,res)=>{
    res.render("./listings/new");
}

module.exports.showListing=async(req,res)=>{
    let {id}=req.params;
    const listing=await Listing.findById(id)
    .populate({
    path:"reviews",
    populate:{path:"author",
        }})
    .populate("owner");
    if(!listing){
        req.flash("error","Listing you requested for does not exist");
       return res.redirect("/listings");
    }
    console.log(listing);
    res.render("./listings/show.ejs",{listing,currUser: req.user,
        mapToken: process.env.MAP_TOKEN}) ;                                                                                                                 
}


module.exports.createListing=async (req,res,next)=>{
   let coordinate= await  geocodingClient.forwardGeocode({
    query: req.body.listing.location,
    limit: 1
})
 .send();

    let url=req.file.path;
      let filename=req.file.filename;
    const newListing=new Listing(req.body.listing);  
    newListing.owner=req.user._id;  
    newListing.image={url,filename};
    newListing.geometry=coordinate.body.features[0].geometry;
    let savedListing=await newListing.save();
    console.log(savedListing);
    req.flash("success","New Listing Created");
    res.redirect("/listings");  
};

module.exports.renderEidtForm=async (req,res)=>{
     let {id}=req.params;
    const listing=await Listing.findById(id);
    if(!listing){
        req.flash("error","Listing you requested for does not exist");
       return res.redirect("/listings");
    }
    let originalImageUrl=listing.image.url;
    originalImageUrl=originalImageUrl.replace("/upload","/upload/w_250")
    res.render("./listings/edit.ejs",{listing,originalImageUrl}) ;
};

module.exports.updateListing=async (req,res)=>{
    let {id}=req.params;
    let listing=await  Listing.findByIdAndUpdate(id,{...req.body.listing});
    if(typeof  req.file!=="undefined"){
    let url=req.file.path;
      let filename=req.file.filename;
      listing.image={url,filename};
      console.log("Image after update:", listing.image);
      await listing.save();
    }
     req.flash("success"," Listing Updated");
    res.redirect(`/listings/${id}`);
};

module.exports.destroyListing=async (req,res)=>{
    let{id}=req.params;
    let deletedListings= await Listing.findByIdAndDelete(id);
    req.flash("success"," Listing Deleted");
      res.redirect("/listings");
};