const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();
//    每天早上七点更新所有资源状态为 available
// 主函数：更新资源状态
exports.main = async (event, context) => {
    try {
        // 定义需要更新的集合和字段
        const collectionsToUpdate = [
            { collectionName: 'all_seat', field: 'status', value: 'available' },
            { collectionName: 'discussion_areas', field: 'status', value: 'available' }, 
            { collectionName: 'phone_booths', field: 'status', value: 'available' }
        ];

        for (const item of collectionsToUpdate) {
            const { collectionName, field, value } = item;

            // 更新集合中所有记录的指定字段
            await db.collection(collectionName).where({}).update({
                data: {
                    [field]: value,
                    updatedAt: new Date() // 更新时间戳
                }
            });

            console.log(`集合 ${collectionName} 的 ${field} 字段已更新为 ${value}`);
        }

        return { success: true, message: "所有资源状态已更新为 available" };

    } catch (err) {
        console.error("更新资源状态失败:", err);
        return { success: false, message: "更新资源状态失败", error: err.message };
    }
};