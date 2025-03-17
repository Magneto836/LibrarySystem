const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();

exports.main = async (event, context) => {
  try {
    // 获取所有座位数据
    const seatsRes = await cloud.callFunction({
      name: 'fetchAllData',
      data: {
        collectionName: 'all_seat' // 指定要查询的集合名称
      }
    });
 
    const seats = seatsRes.result.data || [];
    // 按楼层和区域聚合数据
    const floors = seats.reduce((acc, seat) => {
      let floor = acc.find(f => f.floor === seat.floor);
      if (!floor) {
        // 新增楼层
        const newFloor = {
          floor: seat.floor,
          areas: []
        };
        acc.push(newFloor);
        floor = newFloor;
      }

      // 处理区域
      let area = floor.areas.find(a => a.areaName === seat.area);
      if (!area) {
        // 新增区域
        const newArea = {
          areaName: seat.area,
          totalSeats: 0,
          availableSeats: 0,
          seats: []
        };
        floor.areas.push(newArea);
        area = newArea;
      }

      // 更新区域数据
      area.totalSeats += 1;
      if (seat.status === 'available') {
        area.availableSeats += 1;
      }
      area.seats.push(seat); // 保留原始座位数据

      return acc;
    }, []);

    // 整理最终数据格式（与示例数据结构一致）
    const formattedFloors = floors.map(floor => ({
      floor: floor.floor,
      areas: floor.areas.map(area => ({
        areaName: area.areaName,
        totalSeats: area.totalSeats,
        availableSeats: area.availableSeats,
        // 可选：保留原始座位数据供前端使用
        seats: area.seats
      }))
    }));

    return { floors: formattedFloors };
  } catch (err) {
    console.error('获取数据失败:', err);
    return { error: '获取数据失败', details: err.message };
  }
};