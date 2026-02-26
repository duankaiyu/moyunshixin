一.第一次克隆项目到本地编译器，需安装所需依赖:
   ```bash
   npm install
   ```

   

二.在  `.env`  文件中添加个人令牌

<img width="978" height="229" alt="image" src="https://github.com/user-attachments/assets/1171eee1-26c3-4bd9-a137-505db87c801e" />





三.在  `services\workflowService.ts`  文件中:
   
1.添加  `WORKFLOW_ID`  和  `APP_ID`

<img width="1001" height="860" alt="image" src="https://github.com/user-attachments/assets/26c7bf3d-9811-44de-8877-309f02f2e48e" />




 2.更改模型名称`name`

<img width="716" height="520" alt="image" src="https://github.com/user-attachments/assets/eecd517e-f60b-4c3e-a8e8-ebbc565bfa74" />






四.开发环境运行:
   ```bash
   npm run dev
   ```
