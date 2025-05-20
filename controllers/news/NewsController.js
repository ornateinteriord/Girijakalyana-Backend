const NewsModel = require("../../models/news/News");
const { FormatDate } = require("../../utils/DateFormate");

const getAllNews = async (req, res) => {
  try {
    const newsList = await NewsModel.find({});
    res.status(200).json({ success: true, data: newsList });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
const addNews = async (req, res) => {
  try {
    const { news_details, from_date, to_date, news_type, status } = req.body;
    const formattedFromDate = FormatDate(from_date);
    const formattedToDate = FormatDate(to_date);

    // Rest of your existing code...
    const latestNews = await NewsModel.aggregate([
      { $sort: { news_id: -1 } },
      { $limit: 1 },
    ]);

    let newNewsId = "NEWS001";
    if (latestNews.length > 0) {
      const latestIdNumber = parseInt(
        latestNews[0].news_id.replace("NEWS", ""),
        10
      );
      newNewsId = `NEWS${String(latestIdNumber + 1).padStart(3, "0")}`;
    }

    const newNews = new NewsModel({
      news_id: newNewsId,
      news_details,
      from_date: formattedFromDate,
      to_date: formattedToDate,
      news_type,
      status,
    });

    await newNews.save();
    res.status(201).json({
      success: true,
      message: "News added successfully",
      data: newNews,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message }); // Changed to 400 for client errors
  }
};

module.exports = { getAllNews, addNews };
