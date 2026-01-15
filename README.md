一.第一次克隆项目到本地编译器，需安装所需依赖:
   ```bash
   npm install
   ```

   

二.在  `.env`  文件中添加个人令牌

<img width="800" height="200" alt="image" src="https://github.com/user-attachments/assets/17cb6126-c4ba-4459-94af-ff1eec7baa61" />




三.在  `services\workflowService.ts`  文件中:
   
1.添加  `WORKFLOW_ID`  和  `APP_ID`

<img width="800" height="650" alt="image" src="https://github.com/user-attachments/assets/5155f564-ccb2-457b-82cf-0955b2de0370" />

 2.更改模型名称`name`

<img width="800" height="500" alt="image" src="https://github.com/user-attachments/assets/df4eb5d6-15d6-4281-96b5-c98a5e1f7ea2" />





四.开发环境运行:
   ```bash
   npm run dev
   ```
