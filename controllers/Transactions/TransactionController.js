const AssistanceTransactionModel = require("../../models/Transactions/AssistanceTransaction");

const getAllAssistanceTransactions = async (req, res) => {
    try {
        const userTransactions = await AssistanceTransactionModel.aggregate([
            {
                $lookup: {
                    from: "user_tbl", 
                    localField: "registration_no", 
                    foreignField: "ref_no", 
                    as: "userDetails"
                }
            },
            {
                $unwind: "$userDetails" 
            },
            {
                $project: {
                    transaction_id: 1,
                    date: 1,
                    registration_no: 1,
                    pg_id: 1,
                    bank_ref_no: 1,
                    mode: 1,
                    amount: 1,
                    status: 1,
                    orderno: 1,
                    usertype: 1,
                    username: "$userDetails.username" 
                }
            }
        ]);

        res.status(200).json({ success: true, transactions: userTransactions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = getAllAssistanceTransactions;