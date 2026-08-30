/**
 * Project: BD Job Autofill
 * Module: Bangladesh Districts & Upazilas Reference Data
 * Purpose: Provides the canonical, read-only dataset of all 64 Bangladesh
 *          districts and their associated upazilas (sub-districts), keyed
 *          the same way as the national reference (district id -> upazila
 *          id -> name). Consumed by profile forms and content-script
 *          autofill logic to populate and match District / Upazila
 *          dropdown fields without hardcoding values inline in the UI code.
 * Author: Lead Engineer
 * Version: 1.0.0
 * Dependencies: none (pure ES module, no external imports)
 * Last Updated: 2026-07-06
 */

export const BD_DISTRICTS = Object.freeze([
  {
    id: "26",
    name: "Bagerhat",
    upazilas: Object.freeze([
      { id: "1", name: "Bagerhat Sadar" },
      { id: "5", name: "Chitalmari" },
      { id: "7", name: "Fakirhat" },
      { id: "4", name: "Kachua" },
      { id: "2", name: "Mollahat" },
      { id: "6", name: "Mongla" },
      { id: "3", name: "Morrelganj" },
      { id: "10", name: "Others" },
      { id: "9", name: "Rampal" },
      { id: "8", name: "Sarankhola" }
    ])
  },
  {
    id: "64",
    name: "Bandarban",
    upazilas: Object.freeze([
      { id: "16", name: "Alikadam" },
      { id: "11", name: "Bandarban Sadar" },
      { id: "14", name: "Lama" },
      { id: "17", name: "Naikhongchhari" },
      { id: "18", name: "Others" },
      { id: "15", name: "Rowangchhari" },
      { id: "13", name: "Ruma" },
      { id: "12", name: "Thanchi" }
    ])
  },
  {
    id: "32",
    name: "Barguna",
    upazilas: Object.freeze([
      { id: "20", name: "Amtali" },
      { id: "21", name: "Bamna" },
      { id: "22", name: "Barguna Sadar" },
      { id: "19", name: "Betagi" },
      { id: "24", name: "Others" },
      { id: "23", name: "Patharghata" }
    ])
  },
  {
    id: "29",
    name: "Barishal",
    upazilas: Object.freeze([
      { id: "33", name: "Agailihara" },
      { id: "32", name: "Babuganj" },
      { id: "25", name: "Bakerganj" },
      { id: "30", name: "Banari Para" },
      { id: "26", name: "Barishal Sadar (Kotwali)" },
      { id: "28", name: "Gaurnadi" },
      { id: "27", name: "Hizla" },
      { id: "29", name: "Mehendiganj" },
      { id: "31", name: "Muladi" },
      { id: "34", name: "Others" },
      { id: "35", name: "Wazirpur" }
    ])
  },
  {
    id: "30",
    name: "Bhola",
    upazilas: Object.freeze([
      { id: "36", name: "Bhola Sadar" },
      { id: "39", name: "Burhanuddin" },
      { id: "38", name: "Daulatkhan" },
      { id: "37", name: "Lalmohan" },
      { id: "40", name: "Manpura" },
      { id: "42", name: "Others" },
      { id: "41", name: "Tazumuddin" }
    ])
  },
  {
    id: "10",
    name: "Bogra",
    upazilas: Object.freeze([
      { id: "45", name: "Adamdighi" },
      { id: "43", name: "Bogra Sadar" },
      { id: "47", name: "Dhunat" },
      { id: "48", name: "Dhupchanchia" },
      { id: "44", name: "Gabtali" },
      { id: "51", name: "Kahaloo" },
      { id: "46", name: "Nandigram" },
      { id: "52", name: "Others" },
      { id: "53", name: "Sariakandi" },
      { id: "49", name: "Shajhanpur" },
      { id: "55", name: "Sherpur" },
      { id: "50", name: "Shibganj" },
      { id: "54", name: "Sonatola" }
    ])
  },
  {
    id: "54",
    name: "Brahamanbaria",
    upazilas: Object.freeze([
      { id: "57", name: "Akhaura" },
      { id: "60", name: "Ashuganj" },
      { id: "59", name: "Banchharampur" },
      { id: "58", name: "Brahamanbaria Sadar" },
      { id: "56", name: "Kasba" },
      { id: "64", name: "Nabinagar" },
      { id: "61", name: "Nasirnagar" },
      { id: "62", name: "Others" },
      { id: "63", name: "Sarail" }
    ])
  },
  {
    id: "56",
    name: "Chandpur",
    upazilas: Object.freeze([
      { id: "66", name: "Chandpur Sadar" },
      { id: "65", name: "Faridganj" },
      { id: "68", name: "Hajiganj" },
      { id: "67", name: "Kachua" },
      { id: "69", name: "Matlab" },
      { id: "72", name: "Others" },
      { id: "70", name: "Shahrasti" },
      { id: "71", name: "Uttar Matlab" }
    ])
  },
  {
    id: "13",
    name: "Chapai Nawabganj",
    upazilas: Object.freeze([
      { id: "73", name: "Bholahat" },
      { id: "77", name: "Gomastapur" },
      { id: "74", name: "Nachole" },
      { id: "76", name: "Nawabganj Sadar" },
      { id: "78", name: "Others" },
      { id: "75", name: "Shibganj" }
    ])
  },
  {
    id: "60",
    name: "Chattogram",
    upazilas: Object.freeze([
      { id: "79", name: "Anowara" },
      { id: "86", name: "Bakalia" },
      { id: "80", name: "Bandar(Chitt. Port)" },
      { id: "85", name: "Banshkhali" },
      { id: "87", name: "Bayejid Bostami" },
      { id: "81", name: "Boalkhali" },
      { id: "83", name: "Chandanish" },
      { id: "84", name: "Chandgaon" },
      { id: "82", name: "Double Mooring" },
      { id: "88", name: "Fatikchhari" },
      { id: "92", name: "Halishahar" },
      { id: "93", name: "Hathazari" },
      { id: "89", name: "Karnafuli" },
      { id: "90", name: "Khulshi" },
      { id: "91", name: "Kotwali" },
      { id: "94", name: "Lohagara" },
      { id: "96", name: "Mirsharai" },
      { id: "104", name: "Others" },
      { id: "97", name: "Pahartali" },
      { id: "98", name: "Panchlaish" },
      { id: "95", name: "Patiya" },
      { id: "99", name: "Rangunia" },
      { id: "100", name: "Raozan" },
      { id: "103", name: "Sandwip" },
      { id: "101", name: "Satkania" },
      { id: "102", name: "Sitakunda" }
    ])
  },
  {
    id: "19",
    name: "Chuadanga",
    upazilas: Object.freeze([
      { id: "106", name: "Alamdanga" },
      { id: "107", name: "Chuadanga Sadar" },
      { id: "105", name: "Damurhuda" },
      { id: "108", name: "Jiban Nagar" },
      { id: "109", name: "Others" }
    ])
  },
  {
    id: "61",
    name: "Cox`s Bazar",
    upazilas: Object.freeze([
      { id: "112", name: "Chakaria" },
      { id: "111", name: "Cox`s Bazar Sadar" },
      { id: "110", name: "Kutubdia" },
      { id: "113", name: "Maheshkhali" },
      { id: "118", name: "Others" },
      { id: "114", name: "Pekua" },
      { id: "115", name: "Ramu" },
      { id: "116", name: "Teknaf" },
      { id: "117", name: "Ukhia" }
    ])
  },
  {
    id: "55",
    name: "Cumilla",
    upazilas: Object.freeze([
      { id: "122", name: "Barura" },
      { id: "120", name: "Brahaman Para" },
      { id: "119", name: "Burichang" },
      { id: "121", name: "Chandina" },
      { id: "123", name: "Chauddagram" },
      { id: "124", name: "Cumilla Sadar" },
      { id: "128", name: "Cumilla Sadar South" },
      { id: "125", name: "Daudkandi" },
      { id: "127", name: "Debidwar" },
      { id: "126", name: "Homna" },
      { id: "129", name: "Laksam" },
      { id: "133", name: "Langalkot" },
      { id: "130", name: "Meghna" },
      { id: "131", name: "Monohorganj" },
      { id: "135", name: "Muradnagar" },
      { id: "134", name: "Others" },
      { id: "132", name: "Titas" }
    ])
  },
  {
    id: "40",
    name: "Dhaka",
    upazilas: Object.freeze([
      { id: "140", name: "Adabor" },
      { id: "137", name: "Airport" },
      { id: "136", name: "Badda" },
      { id: "138", name: "Banani" },
      { id: "139", name: "Bangshal" },
      { id: "141", name: "Bhashantek" },
      { id: "144", name: "Cantonment" },
      { id: "142", name: "Chackbazar" },
      { id: "143", name: "Dakshin Khan" },
      { id: "145", name: "Darus-Salam" },
      { id: "146", name: "Demra" },
      { id: "152", name: "Dhamrai" },
      { id: "147", name: "Dhanmondi" },
      { id: "148", name: "Dohar" },
      { id: "149", name: "Gandaria" },
      { id: "151", name: "Gulshan" },
      { id: "150", name: "Hatirjheel" },
      { id: "158", name: "Hazaribhag" },
      { id: "153", name: "Jattrabari" },
      { id: "154", name: "Kadamtoli" },
      { id: "155", name: "Kafrul" },
      { id: "156", name: "Kalabagan" },
      { id: "157", name: "Keraniganj" },
      { id: "160", name: "Khilgaon" },
      { id: "159", name: "Khilkhet" },
      { id: "161", name: "Kotwali" },
      { id: "162", name: "Lalbag" },
      { id: "164", name: "Mirpur Model" },
      { id: "163", name: "Mohammadpur" },
      { id: "165", name: "Motijheel" },
      { id: "166", name: "Mugda" },
      { id: "167", name: "Nawabganj" },
      { id: "168", name: "New Market" },
      { id: "190", name: "Others" },
      { id: "170", name: "Pallabi" },
      { id: "169", name: "Paltan Model" },
      { id: "171", name: "Ramna Model" },
      { id: "172", name: "Rampura" },
      { id: "173", name: "Rupnagar" },
      { id: "174", name: "Sabujbhag" },
      { id: "175", name: "Savar" },
      { id: "176", name: "Shah Ali" },
      { id: "177", name: "Shahbag" },
      { id: "178", name: "Shahjahanpur" },
      { id: "179", name: "Sher e Bangla Nagar" },
      { id: "180", name: "Shyampur" },
      { id: "181", name: "Sutrapur" },
      { id: "182", name: "Tejgaon" },
      { id: "183", name: "Tejgaon Industrial" },
      { id: "185", name: "Turag" },
      { id: "184", name: "Uttar Khan" },
      { id: "186", name: "Uttara East" },
      { id: "187", name: "Uttara West" },
      { id: "188", name: "Vatara" },
      { id: "189", name: "Wari" }
    ])
  },
  {
    id: "03",
    name: "Dinajpur",
    upazilas: Object.freeze([
      { id: "191", name: "Biral" },
      { id: "192", name: "Birampur" },
      { id: "193", name: "Birganj" },
      { id: "194", name: "Bochaganj" },
      { id: "195", name: "Chirirbandar" },
      { id: "196", name: "Dinajpur Sadar" },
      { id: "197", name: "Fulbari" },
      { id: "199", name: "Ghoraghat" },
      { id: "198", name: "Hakimpur" },
      { id: "201", name: "Kaharole" },
      { id: "200", name: "Khansama" },
      { id: "202", name: "Nawabganj" },
      { id: "204", name: "Others" },
      { id: "203", name: "Parbatipur" }
    ])
  },
  {
    id: "45",
    name: "Faridpur",
    upazilas: Object.freeze([
      { id: "208", name: "Alfadanga" },
      { id: "205", name: "Bhanga" },
      { id: "206", name: "Boalmari" },
      { id: "207", name: "Faridpur Sadar" },
      { id: "210", name: "Madukhali" },
      { id: "209", name: "Nagarkanda" },
      { id: "211", name: "Others" },
      { id: "213", name: "Sadarpur" },
      { id: "212", name: "Saltha" }
    ])
  },
  {
    id: "59",
    name: "Feni",
    upazilas: Object.freeze([
      { id: "216", name: "Chhagalnayian" },
      { id: "215", name: "Daganbhuyian" },
      { id: "214", name: "Feni Sadar" },
      { id: "218", name: "Fulgazi" },
      { id: "220", name: "Others" },
      { id: "217", name: "Parshuram" },
      { id: "219", name: "Sonagazi" }
    ])
  },
  {
    id: "08",
    name: "Gaibanda",
    upazilas: Object.freeze([
      { id: "221", name: "Fulchhari" },
      { id: "225", name: "Gaibanda Sadar" },
      { id: "223", name: "Gobidaganj" },
      { id: "228", name: "Others" },
      { id: "222", name: "Palashbari" },
      { id: "224", name: "Sadullapur" },
      { id: "226", name: "Saghatta" },
      { id: "227", name: "Sundarganj" }
    ])
  },
  {
    id: "41",
    name: "Gazipur",
    upazilas: Object.freeze([
      { id: "230", name: "Gazipur Sadar" },
      { id: "231", name: "Kaliakair" },
      { id: "229", name: "Kaliganj" },
      { id: "233", name: "Kapasia" },
      { id: "235", name: "Others" },
      { id: "232", name: "Sreepur" },
      { id: "234", name: "Tongi" }
    ])
  },
  {
    id: "47",
    name: "Gopalganj",
    upazilas: Object.freeze([
      { id: "239", name: "Gopalganj Sadar" },
      { id: "237", name: "Kashiani" },
      { id: "238", name: "Kotalipara" },
      { id: "240", name: "Muksudpur" },
      { id: "241", name: "Others" },
      { id: "236", name: "Tungi Para" }
    ])
  },
  {
    id: "53",
    name: "Habiganj",
    upazilas: Object.freeze([
      { id: "245", name: "Ajmirganj" },
      { id: "243", name: "Bahubal" },
      { id: "242", name: "Baniachang" },
      { id: "246", name: "Chunarughat" },
      { id: "244", name: "Habiganj Sadar" },
      { id: "247", name: "Lakhai" },
      { id: "249", name: "Madhabpur" },
      { id: "248", name: "Nabiganj" },
      { id: "250", name: "Others" }
    ])
  },
  {
    id: "09",
    name: "Jaipurhat",
    upazilas: Object.freeze([
      { id: "254", name: "Akkelpur" },
      { id: "253", name: "Joypurhat  Sadar" },
      { id: "256", name: "Kalai" },
      { id: "251", name: "Khetlal" },
      { id: "255", name: "Others" },
      { id: "252", name: "Panchbibi" }
    ])
  },
  {
    id: "36",
    name: "Jamalpur",
    upazilas: Object.freeze([
      { id: "257", name: "Bakshiganj" },
      { id: "259", name: "Dewanganj" },
      { id: "261", name: "Islampur" },
      { id: "260", name: "Jamalpur Sadar" },
      { id: "258", name: "Madarganj" },
      { id: "262", name: "Melandaha" },
      { id: "264", name: "Others" },
      { id: "263", name: "Sarishabari" }
    ])
  },
  {
    id: "23",
    name: "Jashore",
    upazilas: Object.freeze([
      { id: "268", name: "Abhay Nagar" },
      { id: "266", name: "Bagherpara" },
      { id: "265", name: "Chowghacha" },
      { id: "269", name: "Jhikargacha" },
      { id: "267", name: "Keshabpur" },
      { id: "270", name: "Kotwali" },
      { id: "272", name: "Manirampur" },
      { id: "273", name: "Others" },
      { id: "271", name: "Sharsha" }
    ])
  },
  {
    id: "28",
    name: "Jhalokhathi",
    upazilas: Object.freeze([
      { id: "276", name: "Jhalokhati Sadar" },
      { id: "275", name: "Kanthalia" },
      { id: "274", name: "Nalchity" },
      { id: "277", name: "Others" },
      { id: "278", name: "Rajapur" }
    ])
  },
  {
    id: "20",
    name: "Jhenaidah",
    upazilas: Object.freeze([
      { id: "279", name: "Harinakunda" },
      { id: "281", name: "Jhenaidaha Sadar" },
      { id: "280", name: "Kaliganj" },
      { id: "282", name: "Kotchandpur" },
      { id: "283", name: "Mahespur" },
      { id: "285", name: "Others" },
      { id: "284", name: "Shailkupa" }
    ])
  },
  {
    id: "62",
    name: "Khagrachhari",
    upazilas: Object.freeze([
      { id: "290", name: "Dighinala" },
      { id: "286", name: "Khagrachhari Sadar" },
      { id: "287", name: "Lakshmichhari" },
      { id: "288", name: "Mahalchhari" },
      { id: "289", name: "Manikchhari" },
      { id: "291", name: "Matiranga" },
      { id: "293", name: "Others" },
      { id: "292", name: "Panchhari" },
      { id: "294", name: "Ramgarh" }
    ])
  },
  {
    id: "25",
    name: "Khulna",
    upazilas: Object.freeze([
      { id: "297", name: "Batiaghata" },
      { id: "295", name: "Dacope" },
      { id: "296", name: "Daulatpur" },
      { id: "299", name: "Dighala" },
      { id: "298", name: "Dumuria" },
      { id: "300", name: "Khalishpur" },
      { id: "304", name: "Khan Jahan Ali" },
      { id: "305", name: "Khulna Sadar" },
      { id: "302", name: "Koyra" },
      { id: "307", name: "Others" },
      { id: "303", name: "Paikgachha" },
      { id: "301", name: "Phultala" },
      { id: "306", name: "Rupsa" },
      { id: "308", name: "Sonadanga" },
      { id: "309", name: "Terokhada" }
    ])
  },
  {
    id: "38",
    name: "Kishorganj",
    upazilas: Object.freeze([
      { id: "314", name: "Austagram" },
      { id: "311", name: "Bajitpur" },
      { id: "310", name: "Bhairab" },
      { id: "313", name: "Hossenpur" },
      { id: "312", name: "Itna" },
      { id: "315", name: "Karimganj" },
      { id: "316", name: "Katiadi" },
      { id: "317", name: "Kishoregonj SADAR" },
      { id: "320", name: "Mithamoin" },
      { id: "318", name: "Nikli" },
      { id: "322", name: "Others" },
      { id: "319", name: "Pakundia" },
      { id: "321", name: "Tarail" }
    ])
  },
  {
    id: "07",
    name: "Kurigram",
    upazilas: Object.freeze([
      { id: "323", name: "Bhurungamari" },
      { id: "324", name: "Chilmari" },
      { id: "325", name: "Kurigram Sadar" },
      { id: "326", name: "Nageshwari" },
      { id: "332", name: "Others" },
      { id: "327", name: "Phulbari" },
      { id: "328", name: "Rajarhat" },
      { id: "329", name: "Rajibpur" },
      { id: "330", name: "Raumari" },
      { id: "331", name: "Ulipur" }
    ])
  },
  {
    id: "17",
    name: "Kushtia",
    upazilas: Object.freeze([
      { id: "337", name: "Bheramara" },
      { id: "335", name: "Daulatpur" },
      { id: "336", name: "Khoksa" },
      { id: "333", name: "Kumarkhali" },
      { id: "334", name: "Kushtia Sadar" },
      { id: "338", name: "Mirpur" },
      { id: "339", name: "Others" }
    ])
  },
  {
    id: "05",
    name: "Lalmonirhat",
    upazilas: Object.freeze([
      { id: "344", name: "Aditmari" },
      { id: "340", name: "Hatibanda" },
      { id: "342", name: "Kaliganj" },
      { id: "343", name: "Lalmonirhat Sadar" },
      { id: "345", name: "Others" },
      { id: "341", name: "Patgram" }
    ])
  },
  {
    id: "57",
    name: "Luxmipur",
    upazilas: Object.freeze([
      { id: "347", name: "Komol Nogor" },
      { id: "348", name: "Luxmipur Sadar" },
      { id: "351", name: "Others" },
      { id: "349", name: "Raipur" },
      { id: "346", name: "Ramganj" },
      { id: "350", name: "Ramgati" }
    ])
  },
  {
    id: "48",
    name: "Madaripur",
    upazilas: Object.freeze([
      { id: "355", name: "Kalkini" },
      { id: "353", name: "Madaripur Sadar" },
      { id: "352", name: "Others" },
      { id: "354", name: "Rajoir" }
    ])
  },
  {
    id: "21",
    name: "Magura",
    upazilas: Object.freeze([
      { id: "359", name: "Magura Sadar" },
      { id: "357", name: "Mohammadpur" },
      { id: "358", name: "Others" },
      { id: "360", name: "Shalikha" },
      { id: "356", name: "Sreepur" }
    ])
  },
  {
    id: "39",
    name: "Manikganj",
    upazilas: Object.freeze([
      { id: "363", name: "Daulatpur" },
      { id: "364", name: "Ghior" },
      { id: "362", name: "Harirampur" },
      { id: "361", name: "Manikganj Sadar" },
      { id: "368", name: "Others" },
      { id: "365", name: "Saturia" },
      { id: "366", name: "Shibalaya" },
      { id: "367", name: "Singair" }
    ])
  },
  {
    id: "18",
    name: "Meharpur",
    upazilas: Object.freeze([
      { id: "370", name: "Gangni" },
      { id: "369", name: "Meherpur Sadar" },
      { id: "372", name: "Mujib Nagar" },
      { id: "371", name: "Others" }
    ])
  },
  {
    id: "52",
    name: "Mouluvibazar",
    upazilas: Object.freeze([
      { id: "375", name: "Barlekha" },
      { id: "373", name: "Juri" },
      { id: "374", name: "Kamalganj" },
      { id: "377", name: "Kulaura" },
      { id: "376", name: "Maulvi Bazar Sadar" },
      { id: "379", name: "Others" },
      { id: "378", name: "Rajnagar" },
      { id: "380", name: "Sreemangal" }
    ])
  },
  {
    id: "44",
    name: "Munshiganj",
    upazilas: Object.freeze([
      { id: "381", name: "Gazaria" },
      { id: "384", name: "Louhajang" },
      { id: "382", name: "Munshiganj Sadar" },
      { id: "387", name: "Others" },
      { id: "385", name: "Serajdikhan" },
      { id: "383", name: "Sreenagar" },
      { id: "386", name: "Tongibari" }
    ])
  },
  {
    id: "34",
    name: "Mymensingh",
    upazilas: Object.freeze([
      { id: "391", name: "Bhalukha" },
      { id: "388", name: "Dhobaura" },
      { id: "390", name: "Fulbaria" },
      { id: "389", name: "Gaffargaon" },
      { id: "392", name: "Gauripur" },
      { id: "393", name: "Haluaghat" },
      { id: "398", name: "Ishwarganj" },
      { id: "396", name: "Muktagachha" },
      { id: "394", name: "Mymensingh Sadar" },
      { id: "395", name: "Nandail" },
      { id: "400", name: "Others" },
      { id: "397", name: "Phulpur" },
      { id: "399", name: "Trishl" }
    ])
  },
  {
    id: "11",
    name: "Naogaon",
    upazilas: Object.freeze([
      { id: "401", name: "Atrai" },
      { id: "403", name: "Badalgachhi" },
      { id: "404", name: "Dhamoirhat" },
      { id: "402", name: "Mahadebpur" },
      { id: "405", name: "Manda" },
      { id: "407", name: "Naogaon Sadar" },
      { id: "412", name: "Niamatpur" },
      { id: "411", name: "Others" },
      { id: "406", name: "Patnitala" },
      { id: "408", name: "Porsha" },
      { id: "410", name: "Raninagar" },
      { id: "409", name: "Sapahar" }
    ])
  },
  {
    id: "22",
    name: "Narail",
    upazilas: Object.freeze([
      { id: "413", name: "Kalia" },
      { id: "414", name: "Lohagara" },
      { id: "415", name: "NarailSadar" },
      { id: "416", name: "Others" }
    ])
  },
  {
    id: "43",
    name: "Narayanganj",
    upazilas: Object.freeze([
      { id: "419", name: "Araihazar" },
      { id: "417", name: "Bandar" },
      { id: "418", name: "Narayanganj Sadar" },
      { id: "422", name: "Others" },
      { id: "421", name: "Rupganj" },
      { id: "420", name: "Sonargaon" }
    ])
  },
  {
    id: "42",
    name: "Narsingdi",
    upazilas: Object.freeze([
      { id: "426", name: "Belabo" },
      { id: "423", name: "Manohardi" },
      { id: "425", name: "Narsingdi Sadar" },
      { id: "429", name: "Others" },
      { id: "424", name: "Palash" },
      { id: "427", name: "Roypura" },
      { id: "428", name: "Shibpur" }
    ])
  },
  {
    id: "12",
    name: "Natore",
    upazilas: Object.freeze([
      { id: "434", name: "Bagati Para" },
      { id: "430", name: "Baraigram" },
      { id: "432", name: "Gurudaspur" },
      { id: "431", name: "Lalpur" },
      { id: "433", name: "Natore Sadar" },
      { id: "436", name: "Others" },
      { id: "435", name: "Singra" }
    ])
  },
  {
    id: "33",
    name: "Netrokona",
    upazilas: Object.freeze([
      { id: "437", name: "Atpara" },
      { id: "440", name: "Barhatta" },
      { id: "442", name: "Durgapur" },
      { id: "438", name: "Kalmakanda" },
      { id: "439", name: "Kendua" },
      { id: "441", name: "Khaliajuri" },
      { id: "444", name: "Madan" },
      { id: "443", name: "Mohanganj" },
      { id: "445", name: "Netrokona Sadar" },
      { id: "447", name: "Others" },
      { id: "446", name: "Purbadhala" }
    ])
  },
  {
    id: "04",
    name: "Nilphamari",
    upazilas: Object.freeze([
      { id: "448", name: "Dimla" },
      { id: "452", name: "Domar" },
      { id: "450", name: "Jaldhaka" },
      { id: "449", name: "Kishoreganj" },
      { id: "451", name: "Nilphamari Sadar" },
      { id: "454", name: "Others" },
      { id: "453", name: "Saidpur" }
    ])
  },
  {
    id: "58",
    name: "Noakhali",
    upazilas: Object.freeze([
      { id: "457", name: "Begumganj" },
      { id: "463", name: "Chatkhil" },
      { id: "455", name: "Companiganj" },
      { id: "456", name: "Hatiya" },
      { id: "462", name: "Kobirhat" },
      { id: "459", name: "Noakhali Sadar (Sudharam)" },
      { id: "461", name: "Others" },
      { id: "458", name: "Senbagh" },
      { id: "460", name: "Sonaimuri" },
      { id: "464", name: "Subornachhar" }
    ])
  },
  {
    id: "16",
    name: "Pabna",
    upazilas: Object.freeze([
      { id: "467", name: "Atgharia" },
      { id: "465", name: "Bera" },
      { id: "469", name: "Bhangura" },
      { id: "468", name: "Chatmohar" },
      { id: "466", name: "Faridpur" },
      { id: "470", name: "Ishwardi" },
      { id: "474", name: "Others" },
      { id: "471", name: "Pabna Sadar" },
      { id: "473", name: "Santhia" },
      { id: "472", name: "Sujanagar" }
    ])
  },
  {
    id: "01",
    name: "Panchagarh",
    upazilas: Object.freeze([
      { id: "476", name: "Atwari" },
      { id: "475", name: "Boda" },
      { id: "478", name: "Debiganj" },
      { id: "480", name: "Others" },
      { id: "477", name: "Panchagarh Sadar" },
      { id: "479", name: "Tentulia" }
    ])
  },
  {
    id: "31",
    name: "Patuakhali",
    upazilas: Object.freeze([
      { id: "484", name: "Bauphal" },
      { id: "486", name: "Dashmina" },
      { id: "481", name: "Dumki" },
      { id: "482", name: "Galachipa" },
      { id: "483", name: "Kala Para" },
      { id: "485", name: "Mirzaganj" },
      { id: "488", name: "Others" },
      { id: "487", name: "Patuakhali Sadar" }
    ])
  },
  {
    id: "27",
    name: "Pirojpur",
    upazilas: Object.freeze([
      { id: "489", name: "Bhandaria" },
      { id: "491", name: "Kawkhali" },
      { id: "490", name: "Mathbaria" },
      { id: "492", name: "Nazirpur" },
      { id: "493", name: "Nesarabad (Swarupkati)" },
      { id: "496", name: "Others" },
      { id: "494", name: "Pirojpur Sadar" },
      { id: "495", name: "Zianagar" }
    ])
  },
  {
    id: "46",
    name: "Rajbari",
    upazilas: Object.freeze([
      { id: "497", name: "Balia Kandi" },
      { id: "498", name: "Goalandaghat" },
      { id: "499", name: "Kalukhali" },
      { id: "502", name: "Others" },
      { id: "500", name: "Pangsha" },
      { id: "501", name: "Rajbari Sadar" }
    ])
  },
  {
    id: "14",
    name: "Rajshahi",
    upazilas: Object.freeze([
      { id: "505", name: "Bagha" },
      { id: "503", name: "Baghmara" },
      { id: "514", name: "Boalia (Sadar)" },
      { id: "504", name: "Durgapur" },
      { id: "506", name: "Godagari" },
      { id: "507", name: "Matihar" },
      { id: "508", name: "Mohanpur" },
      { id: "512", name: "Others" },
      { id: "510", name: "Paba" },
      { id: "509", name: "Puthia" },
      { id: "513", name: "Rajpara" },
      { id: "511", name: "Tanore" }
    ])
  },
  {
    id: "63",
    name: "Rangamati",
    upazilas: Object.freeze([
      { id: "519", name: "Bagaichhari" },
      { id: "516", name: "Barkal" },
      { id: "515", name: "Belaichhari" },
      { id: "518", name: "Juraichhari" },
      { id: "517", name: "Kaptai" },
      { id: "520", name: "Kawkhali (Betbunia)" },
      { id: "522", name: "Langadu" },
      { id: "524", name: "Others" },
      { id: "523", name: "Rajasthali" },
      { id: "521", name: "Rangamati Sadar" }
    ])
  },
  {
    id: "06",
    name: "Rangpur",
    upazilas: Object.freeze([
      { id: "525", name: "Badarganj" },
      { id: "526", name: "Kaunia" },
      { id: "527", name: "Mitha Pukur" },
      { id: "531", name: "Others" },
      { id: "528", name: "Pirgachha" },
      { id: "530", name: "Pirganj" },
      { id: "529", name: "Rangpur Sadar" },
      { id: "532", name: "Taraganj" }
    ])
  },
  {
    id: "24",
    name: "Satkhira",
    upazilas: Object.freeze([
      { id: "533", name: "Assasuni" },
      { id: "535", name: "Debhata" },
      { id: "534", name: "Kalaroa" },
      { id: "536", name: "Kaliganj" },
      { id: "540", name: "Others" },
      { id: "537", name: "Satkhira Sadar" },
      { id: "538", name: "Shyamnagar" },
      { id: "539", name: "Tala" }
    ])
  },
  {
    id: "49",
    name: "Shariatpur",
    upazilas: Object.freeze([
      { id: "542", name: "Bhaderganj" },
      { id: "541", name: "Damudya" },
      { id: "544", name: "Gosairhat" },
      { id: "543", name: "Naria" },
      { id: "547", name: "Others" },
      { id: "545", name: "Palong(Sadar)" },
      { id: "546", name: "Zanjira" }
    ])
  },
  {
    id: "35",
    name: "Sherpur",
    upazilas: Object.freeze([
      { id: "549", name: "Jhenaigati" },
      { id: "550", name: "Nakla" },
      { id: "548", name: "Nalitabari" },
      { id: "553", name: "Others" },
      { id: "552", name: "Sherpur Sadar" },
      { id: "551", name: "Sreebardi" }
    ])
  },
  {
    id: "15",
    name: "Sirajganj",
    upazilas: Object.freeze([
      { id: "554", name: "Belkuchi" },
      { id: "555", name: "Chauhali" },
      { id: "558", name: "Kamarkhanda" },
      { id: "556", name: "Kazipur" },
      { id: "560", name: "Others" },
      { id: "557", name: "Royganj" },
      { id: "562", name: "Shahjadpur" },
      { id: "559", name: "Sirajganj Sadar" },
      { id: "563", name: "Tarash" },
      { id: "561", name: "Ullah Para" }
    ])
  },
  {
    id: "50",
    name: "Sunamganj",
    upazilas: Object.freeze([
      { id: "565", name: "Bishwambarpur" },
      { id: "564", name: "Chhatak" },
      { id: "567", name: "Daxin Sunamganj" },
      { id: "566", name: "Derai" },
      { id: "568", name: "Dharampasha" },
      { id: "569", name: "Dowarabazar" },
      { id: "570", name: "Jagannatpur" },
      { id: "571", name: "Jamalganj" },
      { id: "575", name: "Others" },
      { id: "573", name: "Sulla" },
      { id: "572", name: "Sunamganj Sadar" },
      { id: "574", name: "Tahirpur" }
    ])
  },
  {
    id: "51",
    name: "Sylhet",
    upazilas: Object.freeze([
      { id: "576", name: "Balaganj" },
      { id: "577", name: "Beani Bazar" },
      { id: "582", name: "Bishwanath" },
      { id: "579", name: "Companiganj" },
      { id: "578", name: "Fenchuganj" },
      { id: "580", name: "Golabganj" },
      { id: "581", name: "Gowainghat" },
      { id: "583", name: "Jaintiapur" },
      { id: "584", name: "Kanaighat" },
      { id: "585", name: "Kowtali" },
      { id: "588", name: "Others" },
      { id: "586", name: "South Surma" },
      { id: "587", name: "Zakirganj" }
    ])
  },
  {
    id: "37",
    name: "Tangail",
    upazilas: Object.freeze([
      { id: "590", name: "Basail" },
      { id: "589", name: "Bhuapur" },
      { id: "591", name: "Delduar" },
      { id: "593", name: "Dhonbari" },
      { id: "592", name: "Ghatail" },
      { id: "594", name: "Gopalpur" },
      { id: "598", name: "Kalihati" },
      { id: "595", name: "Madhupur" },
      { id: "599", name: "Mirzapur" },
      { id: "596", name: "Nagarpur" },
      { id: "601", name: "Others" },
      { id: "597", name: "Sakhipur" },
      { id: "600", name: "Tangail Sadar" }
    ])
  },
  {
    id: "02",
    name: "Thakurgaon",
    upazilas: Object.freeze([
      { id: "605", name: "Baliadangi" },
      { id: "604", name: "Haripur" },
      { id: "607", name: "Others" },
      { id: "602", name: "Pirganj" },
      { id: "603", name: "Ranisankail" },
      { id: "606", name: "Thakurgaon Sadar" }
    ])
  },
]);
/**
 * Looks up a district by its id.
 * @param {string} districtId
 * @returns {{id: string, name: string, upazilas: ReadonlyArray<{id: string, name: string}>}|undefined}
 */
export function findDistrictById(districtId) {
  return BD_DISTRICTS.find((district) => district.id === districtId);
}

/**
 * Looks up a district by its display name (case-insensitive, exact match).
 * @param {string} districtName
 * @returns {{id: string, name: string, upazilas: ReadonlyArray<{id: string, name: string}>}|undefined}
 */
export function findDistrictByName(districtName) {
  if (!districtName) {
    return undefined;
  }
  const normalized = districtName.trim().toLowerCase();
  return BD_DISTRICTS.find((district) => district.name.toLowerCase() === normalized);
}

/**
 * Looks up an upazila within a given district by upazila id.
 * @param {string} districtId
 * @param {string} upazilaId
 * @returns {{id: string, name: string}|undefined}
 */
export function findUpazilaById(districtId, upazilaId) {
  const district = findDistrictById(districtId);
  if (!district) {
    return undefined;
  }
  return district.upazilas.find((upazila) => upazila.id === upazilaId);
}

/**
 * Looks up an upazila within a given district by upazila display name
 * (case-insensitive, exact match).
 * @param {string} districtId
 * @param {string} upazilaName
 * @returns {{id: string, name: string}|undefined}
 */
export function findUpazilaByName(districtId, upazilaName) {
  const district = findDistrictById(districtId);
  if (!district || !upazilaName) {
    return undefined;
  }
  const normalized = upazilaName.trim().toLowerCase();
  return district.upazilas.find((upazila) => upazila.name.toLowerCase() === normalized);
}
