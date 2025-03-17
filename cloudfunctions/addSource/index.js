
const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();

exports.main = async (event, context) => {
    try {
        const { resourceType } = event;

        if (!resourceType) {
            return { success: false, message: "缺少资源类型参数" };
        }

        let collectionName, dataGenerator;

        switch (resourceType) {
            case 'seats':
                collectionName = 'all_seat';
                const { areas: seatAreas, floors, seatsPerArea } = event;
                if (!seatAreas || !floors || !seatsPerArea) {
                    return { success: false, message: "初始化座位所需参数不完整" };
                }
                dataGenerator = () => generateSeats(seatAreas, floors, seatsPerArea);
                break;

            case 'discussionAreas':
                collectionName = 'discussion_areas';
                const { areas: discussionAreas, floors: disfloors, topicsPerArea: disPerArea } = event;
                if (!discussionAreas || !disPerArea || !disfloors) {
                    return { success: false, message: "初始化讨论区所需参数不完整" };
                }
                dataGenerator = () => generateDiscussionAreas(discussionAreas, disfloors, disPerArea);
                break;

            case 'phoneBooths':
                collectionName = 'phone_booths';
                const { locations, boothsPerLocation } = event;
                if (!locations || !boothsPerLocation) {
                    return { success: false, message: "初始化电话亭所需参数不完整" };
                }
                dataGenerator = () => generatePhoneBooths(locations, boothsPerLocation);
                break;

            default:
                return { success: false, message: "无效的资源类型" };
        }

        // 检查集合是否存在，不存在则创建
        const collectionExists = await checkCollectionExists(collectionName);
        if (collectionExists) {
            const result = await db.collection(collectionName).limit(1).get();
            if (result.data.length > 0) {
                console.log(`${resourceType} 数据已存在，无需重新生成`);
                return { success: false, message: `${resourceType} 数据已存在` };
            }
        }

        // 生成数据并插入
        const totalResources = dataGenerator();
        const batchSize = 50;
        for (let i = 0; i < totalResources.length; i += batchSize) {
            const batch = totalResources.slice(i, i + batchSize);
            await db.collection(collectionName).add({ data: batch });
        }

        return { success: true, message: `${resourceType} 初始化成功` };

    } catch (err) {
        console.error("初始化资源失败:", err);
        return { success: false, message: "初始化资源失败", error: err.message };
    }
};

// 辅助函数：检查集合是否存在
async function checkCollectionExists(collectionName) {
    try {
        await db.collection(collectionName).count();
        return true;
    } catch (err) {
        if (err.errCode === -502005) {
            await db.createCollection(collectionName);
            return false;
        }
        throw err;
    }
}

// 生成讨论区数据（修正后）
function generateDiscussionAreas(areas, floors, topicsPerArea) {
    const totalDiscussions = [];
    for (const floor of floors) {
        for (const area of areas) {
            for (let i = 1; i <= topicsPerArea; i++) {
                const topicId = `${area}-${i}`;
                totalDiscussions.push({
                    topicId,
                    area,
                    status: "available",
                    floor,
                    capacity: 6, // 默认容量
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
            }
        }
    }
    return totalDiscussions;
}


// 生成座位数据
function generateSeats(areas, floors, seatsPerArea) {
    const totalSeats = [];
    for (const floor of floors) {
        for (const area of areas) {
            for (let i = 1; i <= seatsPerArea; i++) {
                const seatId = `${area}${i.toString().padStart(3, '0')}`;
                totalSeats.push({
                    seatId,
                    area,
                    status: "available",
                    floor,
                    capacity: 1,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
            }
        }
    }
    return totalSeats;
}


// 生成电话亭数据
function generatePhoneBooths(locations, boothsPerLocation) {
    const totalBooths = [];
    for (const location of locations) {
        for (let i = 1; i <= boothsPerLocation; i++) {
            const boothId = `${location}-${i}`;
            totalBooths.push({
                boothId,
                location,
                status: "available",
                phoneType: "standard",
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }
    }
    return totalBooths;
}