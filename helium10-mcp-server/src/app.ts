import statsRoutes from './routes/stats-routes';
import activityRoutes from './routes/activity-routes';
import artifactRoutes from './routes/artifact-routes';
import toolRoutes from './routes/tool-routes';
import workflowRoutes from './routes/workflow-routes';

app.use('/api/stats', statsRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/artifacts', artifactRoutes);
app.use('/api/tools', toolRoutes);
app.use('/api/workflows', workflowRoutes); 