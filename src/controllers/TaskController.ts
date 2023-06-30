import { Request, Response } from "express";
import {
  UpdateResult,
  getManager
} from "typeorm";
import { connect } from "../database/index";
import { NotificationEmail } from "../Services/NotificationEmail";
require("dotenv").config();

connect()
const manager = getManager()

export class TaskController {
  async create (request: Request, response: Response) {
    try {
      const body = request.body

      const task = await manager
        .createQueryBuilder()
        .insert()
        .into('tasks')
        .values({
          title: body.title,
          description: body.description || null,
          deadline: body.deadline,
        })
        .returning('id')
        .execute()

      if (body.hasOwnProperty('score')) {
        await manager
          .createQueryBuilder()
          .insert()
          .into('public.scores')
          .values({
            task_id: task.raw[0].id,
            responsible_user: body.score.responsible_user,
            value: body.score.value,
            finished: body.score.finished,
          })
          .execute();
          const user = await manager
          .createQueryBuilder()
          .select("*")
          .from("users", "")
          .where(`users.id = ${body.score.responsible_user}`)
          .execute();
          console.log(user)
          if(user){
            await new NotificationEmail().sendEmail(user[0].email, "Nova tarefa cadastrada na RepTask!", "Olá "+ user[0].name + ", a tarefa "+body.title+" foi cadastrada em sua república e atribuida a você");
          }
      }

      response.status(200).send({
        message: 'Tarefa cadastrada com sucesso!',
      })
    } catch (error) {
      console.error(error)
      return response.status(500).send({
        error: 'Houve um erro na aplicação',
      })
    }
  }

  async edit (request: Request, response: Response) {
    try {
      const body = request.body
      const taskId = request.params.id

      const updateQueries: Promise<UpdateResult>[] = []

      updateQueries.push(
        manager
          .createQueryBuilder()
          .update('public.tasks')
          .set({
            title: body.title,
            description: body.description || null,
            deadline: body.deadline,
          })
          .where(`id = ${taskId}`)
          .execute()
      )

      if (body.hasOwnProperty('score')) {
        updateQueries.push(
          manager
            .createQueryBuilder()
            .update('public.scores')
            .set({
              responsible_user: body.score.responsible_user,
              value: body.score.value,
              finished: body.score.finished,
            })
            .where(`task_id = ${taskId}`)
            .execute()
        )
      }

      await Promise.all(updateQueries).then(async () => {
        const user = await manager
        .createQueryBuilder()
        .select("*")
        .from("users", "")
        .where(`users.id = ${body.score.responsible_user}`)
        .execute();
        if(user){
          await new NotificationEmail().sendEmail(user[0].email, "Atualização em sua tarefa na RepTask!", "Olá "+ user[0].name + ", a tarefa "+body.title+", atribuída a você, teve atualizações. Entre em sua república e confira");
        }
      });

      return response.status(200).send({
        message: 'Tarefa editada com sucesso!',
      })
    } catch (error) {
      console.error(error)
      return response.status(500).send({
        error: 'Houve um erro na aplicação',
      })
    }
  }

  async delete (request: Request, response: Response) {
    try {
      const taskId = request.params.id
      await manager.createQueryBuilder().delete().from('public.scores').where(`task_id = ${taskId}`).execute()
      await manager.createQueryBuilder().delete().from('public.tasks').where(`id = ${taskId}`).execute()

      response.status(200).send({
        message: 'Tarefa excluída com sucesso!',
      })
    } catch (error) {
      console.error(error)
      return response.status(500).send({
        error: 'Houve um erro na aplicação',
      })
    }
  }

  async get (request: Request, response: Response) {
    try {
      const option = Number(request.params.option)

      const taskQuery = manager
        .createQueryBuilder()
        .select('*')
        .from('tasks', '')
        .innerJoin('scores', '', 'tasks.id = scores.task_id')

      const user = Number(request.params.username)
      if (user) {
        taskQuery.where(`scores.responsible_user = ${user}`)
      }
      switch (option) {
        // somente pendentes
        case 0: {
          taskQuery.andWhere('scores.finished = false')
          break
        }

        // somente finalizadas
        case 1: {
          taskQuery.andWhere('scores.finished = true')
          break
        }

        // todas as tarefas
        default: {
          break
        }
      }
      const results = await taskQuery.getRawMany()
      return response.status(200).send(results)
    } catch (error) {
      console.error(error)
      return response.status(500).send({
        error: 'Houve um erro na aplicação',
      })
    }
  }

  async getAll (request: Request, response: Response) {
    try {
      const tasksQuery = manager
        .createQueryBuilder()
        .select('*')
        .from('tasks', '')
        .innerJoin('scores', '', 'tasks.id = scores.task_id')

      const user = Number(request.params.username)
      if (user) {
        tasksQuery.where(`scores.responsible_user = ${user}`)
      }
      const results = await tasksQuery.getRawMany()

      return response.status(200).send(results)
    } catch (error) {
      console.error(error)
      return response.status(500).send({
        error: 'Houve um erro na aplicação',
      })
    }
  }
}
