<script setup lang="ts">
const { t } = useI18n({
  messages: {
    en: {
      hero: {
        title: 'Your digital grade book',
        description: 'A simple and powerful tool for teachers to track grades, attendance, and student progress — all in one place.',
        signin: 'Sign in',
        dashboard: 'Open journal',
      },
      features: {
        title: 'Everything a teacher needs',
        description: 'Designed for educators who want to focus on teaching, not paperwork.',
        items: {
          grades: {
            title: 'Grade management',
            description: 'Log grades for any subject, assignment type, or grading scale. Edit and review the full history at any time.',
          },
          attendance: {
            title: 'Attendance tracking',
            description: 'Mark presence, absence, or tardiness per lesson. Get instant attendance summaries for each student.',
          },
          subjects: {
            title: 'Subjects & classes',
            description: 'Organize students by class and subject. Manage multiple groups without losing track.',
          },
          progress: {
            title: 'Student progress',
            description: 'See each student\'s performance over time with clear averages and trend indicators.',
          },
          reports: {
            title: 'Reports & export',
            description: 'Generate summary reports for a class or individual student — ready to share with administration.',
          },
          access: {
            title: 'Secure access',
            description: 'Each teacher sees only their own classes. Student data stays private and protected.',
          },
        },
      },
      cta: {
        title: 'Start managing your journal today',
        description: 'Sign in with your institution account and open your first class in minutes.',
        action: 'Go to journal',
      },
    },
    ru: {
      hero: {
        title: 'Ваш цифровой классный журнал',
        description: 'Простой и удобный инструмент для преподавателей — ставьте оценки, отмечайте посещаемость и следите за успеваемостью учеников в одном месте.',
        signin: 'Войти',
        dashboard: 'Открыть журнал',
      },
      features: {
        title: 'Всё необходимое для преподавателя',
        description: 'Создано для тех, кто хочет заниматься обучением, а не бумажной работой.',
        items: {
          grades: {
            title: 'Управление оценками',
            description: 'Выставляйте оценки по любым предметам и типам работ. История оценок всегда под рукой.',
          },
          attendance: {
            title: 'Учёт посещаемости',
            description: 'Отмечайте присутствие, отсутствие или опоздание на каждом занятии. Сводка посещаемости формируется автоматически.',
          },
          subjects: {
            title: 'Предметы и классы',
            description: 'Организуйте учеников по классам и предметам. Ведите несколько групп без путаницы.',
          },
          progress: {
            title: 'Успеваемость учеников',
            description: 'Следите за динамикой каждого ученика — средний балл и тренд видны с первого взгляда.',
          },
          reports: {
            title: 'Отчёты и экспорт',
            description: 'Формируйте сводные отчёты по классу или отдельному ученику и передавайте их в администрацию.',
          },
          access: {
            title: 'Безопасный доступ',
            description: 'Каждый преподаватель видит только свои классы. Данные учеников надёжно защищены.',
          },
        },
      },
      cta: {
        title: 'Начните вести журнал уже сегодня',
        description: 'Войдите через аккаунт учебного заведения и откройте свой первый класс за несколько минут.',
        action: 'Перейти в журнал',
      },
    },
  },
})
</script>

<template>
  <NuxtLayout name="landing">
    <UPageHero
      :title="t('hero.title')"
      :description="t('hero.description')"
      :links="[{
        label: t('hero.signin'),
        to: '/auth/login',
        icon: 'i-lucide-log-in',
        size: 'xl',
      }, {
        label: t('hero.dashboard'),
        to: '/dashboard',
        icon: 'i-lucide-notebook-pen',
        size: 'xl',
        color: 'neutral',
        variant: 'subtle',
      }]"
    />

    <UPageSection
      id="features"
      :title="t('features.title')"
      :description="t('features.description')"
      :features="[{
        icon: 'i-lucide-star',
        title: t('features.items.grades.title'),
        description: t('features.items.grades.description'),
      }, {
        icon: 'i-lucide-calendar-check',
        title: t('features.items.attendance.title'),
        description: t('features.items.attendance.description'),
      }, {
        icon: 'i-lucide-users',
        title: t('features.items.subjects.title'),
        description: t('features.items.subjects.description'),
      }, {
        icon: 'i-lucide-trending-up',
        title: t('features.items.progress.title'),
        description: t('features.items.progress.description'),
      }, {
        icon: 'i-lucide-file-bar-chart',
        title: t('features.items.reports.title'),
        description: t('features.items.reports.description'),
      }, {
        icon: 'i-lucide-shield-check',
        title: t('features.items.access.title'),
        description: t('features.items.access.description'),
      }]"
    />

    <UPageSection>
      <UPageCTA
        :title="t('cta.title')"
        :description="t('cta.description')"
        variant="subtle"
        :links="[{
          label: t('cta.action'),
          to: '/auth/login',
          icon: 'i-lucide-notebook-pen',
          color: 'neutral',
          trailingIcon: 'i-lucide-arrow-right',
        }]"
      />
    </UPageSection>
  </NuxtLayout>
</template>
